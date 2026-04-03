import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets'
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { ChatService } from './chat.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import Redis from 'ioredis'

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true)
      else callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server

  // Local per-instance connection count (handles multiple tabs on same instance)
  private connectionCount = new Map<string, number>()
  // Local cache for fast reads; Redis is the source of truth across instances
  private onlineUsers = new Set<string>()
  // Redis client for cross-instance presence — null when REDIS_URL is not set
  private redis: Redis | null = null

  private readonly ONLINE_KEY = 'chat:online'

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, { lazyConnect: true })
        await this.redis.connect()
        // Clear stale presence from a previous crash/restart
        await this.redis.del(this.ONLINE_KEY)
      } catch {
        console.warn('[ChatGateway] Redis unavailable — using in-memory presence')
        this.redis = null
      }
    }
  }

  async onModuleDestroy() {
    this.redis?.disconnect()
  }

  async getMetrics() {
    const onlineCount = this.redis
      ? await this.redis.scard(this.ONLINE_KEY)
      : this.onlineUsers.size
    return {
      onlineUsers: onlineCount,
      socketConnections: this.server?.engine?.clientsCount ?? 0,
    }
  }

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers?.cookie ?? ''
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
      const token = match?.[1]
      if (!token) { client.disconnect(); return }

      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET })

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, firstName: true, lastName: true, isSuspended: true },
      })
      if (!user || user.isSuspended || !['PRO', 'ADMIN'].includes(user.role)) {
        client.disconnect()
        return
      }

      client.data.userId = user.id
      client.data.userName = `${user.firstName} ${user.lastName}`
      client.join(`chat:user:${user.id}`)

      // Increment local connection count (multi-tab on this instance)
      const localCount = (this.connectionCount.get(user.id) ?? 0) + 1
      this.connectionCount.set(user.id, localCount)

      // Mark online in Redis (SADD is idempotent) or local Set
      const wasOffline = !this.onlineUsers.has(user.id)
      this.onlineUsers.add(user.id)
      if (this.redis) await this.redis.sadd(this.ONLINE_KEY, user.id)

      // Update lastSeenAt in DB (fire-and-forget)
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      }).catch(() => {})

      // Only broadcast user_online on their very first connection (cross-instance aware)
      if (wasOffline) this.server.emit('user_online', { userId: user.id })

      // Send new client the full cross-instance online list
      const onlineList = this.redis
        ? await this.redis.smembers(this.ONLINE_KEY)
        : Array.from(this.onlineUsers)
      client.emit('online_users_list', { userIds: onlineList })
    } catch {
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId
    if (!userId) return

    const localCount = (this.connectionCount.get(userId) ?? 1) - 1
    if (localCount > 0) {
      // Still has other tabs open on this instance — stay online
      this.connectionCount.set(userId, localCount)
      return
    }

    this.connectionCount.delete(userId)

    // Check if user still has sockets on ANY instance via Socket.IO room
    // (works correctly when the Redis adapter is active)
    const remaining = await this.server.in(`chat:user:${userId}`).fetchSockets()
    const hasOtherSockets = remaining.some(s => s.id !== client.id)

    if (!hasOtherSockets) {
      // Truly offline across all instances
      this.onlineUsers.delete(userId)
      if (this.redis) await this.redis.srem(this.ONLINE_KEY, userId)
      this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      }).catch(() => {})
      this.server.emit('user_offline', { userId })
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoin(client: Socket, conversationId: string) {
    if (!client.data.userId) return
    client.join(`conversation:${conversationId}`)
    await this.chatService.markAsRead(conversationId, client.data.userId).catch(() => {})
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(client: Socket, conversationId: string) {
    client.leave(`conversation:${conversationId}`)
  }

  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, data: {
    conversationId: string
    content?: string
    type: 'TEXT' | 'VOICE'
    audioData?: string
    audioUrl?: string
    audioDuration?: number
  }) {
    if (!client.data.userId) return

    // Validate voice message size (max ~500KB base64, roughly 60s of opus audio)
    if (data.type === 'VOICE' && data.audioData && data.audioData.length > 700_000) {
      client.emit('error', { message: 'Voice message too long (max 60 seconds)' })
      return
    }

    try {
      const message = await this.chatService.createMessage({
        conversationId: data.conversationId,
        senderId: client.data.userId,
        content: data.content,
        type: data.type,
        audioData: data.audioData,
        audioUrl: data.audioUrl,
        audioDuration: data.audioDuration,
      })

      this.server.to(`conversation:${data.conversationId}`).emit('new_message', message)

      const participants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      })
      for (const p of participants) {
        this.server.to(`chat:user:${p.userId}`).emit('conversation_updated', {
          conversationId: data.conversationId,
          lastMessage: message,
        })

        if (p.userId !== client.data.userId) {
          this.notifications.create({
            userId: p.userId,
            type: 'CHAT_MESSAGE',
            title: 'New message',
            message: data.type === 'VOICE'
              ? `${client.data.userName} sent a voice message`
              : `${client.data.userName}: ${(data.content || '').slice(0, 80)}`,
            link: '/app/chat',
          }).catch(() => {})
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message'
      client.emit('error', { message: msg })
    }
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, conversationId: string) {
    if (!client.data.userId) return
    client.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: client.data.userId,
      userName: client.data.userName,
    })
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(client: Socket, conversationId: string) {
    if (!client.data.userId) return
    client.to(`conversation:${conversationId}`).emit('user_stop_typing', {
      userId: client.data.userId,
    })
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(client: Socket, conversationId: string) {
    if (!client.data.userId) return
    await this.chatService.markAsRead(conversationId, client.data.userId).catch(() => {})
  }

  // ── WebRTC Voice Call Signaling ───────────────────────────────

  @SubscribeMessage('call_offer')
  handleCallOffer(client: Socket, data: { targetUserId: string; conversationId: string; offer: RTCSessionDescriptionInit }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('call_incoming', {
      from: { userId: client.data.userId, userName: client.data.userName },
      conversationId: data.conversationId,
      offer: data.offer,
    })
  }

  @SubscribeMessage('call_answer')
  handleCallAnswer(client: Socket, data: { targetUserId: string; answer: RTCSessionDescriptionInit }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('call_answered', { answer: data.answer })
  }

  @SubscribeMessage('call_reject')
  handleCallReject(client: Socket, data: { targetUserId: string }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('call_rejected', { userId: client.data.userId })
  }

  @SubscribeMessage('call_end')
  async handleCallEnd(client: Socket, data: { targetUserId: string; conversationId?: string; duration?: number }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('call_ended', { userId: client.data.userId })

    // Save a CALL message in the conversation so both users see it in history
    if (data.conversationId && data.duration != null && data.duration > 0) {
      try {
        const message = await this.chatService.createMessage({
          conversationId: data.conversationId,
          senderId: client.data.userId,
          content: `Voice call · ${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}`,
          type: 'CALL' as any,
          audioDuration: data.duration,
        })
        // Broadcast to conversation room
        this.server.to(`conversation:${data.conversationId}`).emit('new_message', message)
        // Update conversation list for both
        const participants = await this.prisma.conversationParticipant.findMany({
          where: { conversationId: data.conversationId },
          select: { userId: true },
        })
        for (const p of participants) {
          this.server.to(`chat:user:${p.userId}`).emit('conversation_updated', {
            conversationId: data.conversationId,
            lastMessage: message,
          })
        }
      } catch { /* ignore — call history is nice-to-have, not critical */ }
    }
  }

  @SubscribeMessage('call_missed')
  async handleCallMissed(client: Socket, data: { conversationId: string; targetUserId: string }) {
    if (!client.data.userId || !data.conversationId) return
    try {
      const message = await this.chatService.createMessage({
        conversationId: data.conversationId,
        senderId: client.data.userId,
        content: 'Missed call',
        type: 'CALL' as any,
        audioDuration: 0,
      })
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', message)
    } catch { /* ignore */ }
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(client: Socket, data: { targetUserId: string; candidate: RTCIceCandidateInit }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('ice_candidate', { candidate: data.candidate })
  }

  @SubscribeMessage('screen_offer')
  handleScreenOffer(client: Socket, data: { targetUserId: string; offer: RTCSessionDescriptionInit }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('screen_offer', { offer: data.offer })
  }

  @SubscribeMessage('screen_answer')
  handleScreenAnswer(client: Socket, data: { targetUserId: string; answer: RTCSessionDescriptionInit }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('screen_answer', { answer: data.answer })
  }

  @SubscribeMessage('screen_share_stopped')
  handleScreenShareStopped(client: Socket, data: { targetUserId: string }) {
    if (!client.data.userId) return
    this.server.to(`chat:user:${data.targetUserId}`).emit('screen_share_stopped', {})
  }
}
