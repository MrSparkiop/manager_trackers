import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { ChatService } from './chat.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

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

      this.server.emit('user_online', { userId: user.id })
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.server.emit('user_offline', { userId: client.data.userId })
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
    audioDuration?: number
  }) {
    if (!client.data.userId) return

    // Validate voice message size (max ~500KB base64 ≈ 60s of opus audio)
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
}
