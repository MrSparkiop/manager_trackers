import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MessageType, Prisma } from '@prisma/client'

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /** List PRO/ADMIN users that can be chatted with */
  async getChatUsers(currentUserId: string, search?: string) {
    const where: Prisma.UserWhereInput = {
      id: { not: currentUserId },
      role: { in: ['PRO', 'ADMIN'] },
      isSuspended: false,
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    return this.prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, lastSeenAt: true },
      orderBy: { firstName: 'asc' },
      take: 30,
    })
  }

  /** Get or create a 1-on-1 conversation between two users */
  async getOrCreateConversation(userId: string, otherUserId: string) {
    // Verify other user is PRO/ADMIN
    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, role: true, isSuspended: true },
    })
    if (!otherUser) throw new NotFoundException('User not found')
    if (!['PRO', 'ADMIN'].includes(otherUser.role)) {
      throw new ForbiddenException('Can only chat with PRO or ADMIN users')
    }
    if (otherUser.isSuspended) throw new ForbiddenException('User is suspended')

    // Find existing conversation where both users are participants
    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
        participants: { every: { userId: { in: [userId, otherUserId] } } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, lastSeenAt: true } } },
        },
      },
    })
    if (existing) return existing

    return this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, lastSeenAt: true } } },
        },
      },
    })
  }

  /** List conversations for a user with last message preview */
  async getMyConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, lastSeenAt: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return Promise.all(conversations.map(async (conv) => {
      const myParticipant = conv.participants.find(p => p.userId === userId)
      const unreadCount = myParticipant
        ? await this.prisma.chatMessage.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              createdAt: { gt: myParticipant.lastReadAt },
            },
          })
        : 0

      return {
        ...conv,
        lastMessage: conv.messages[0] ?? null,
        unreadCount,
      }
    }))
  }

  /** Get paginated message history for a conversation */
  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })
    if (!participant) throw new ForbiddenException('Not a participant in this conversation')

    const take = Math.min(100, Math.max(1, limit))
    const skip = (Math.max(1, page) - 1) * take

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { conversationId },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.chatMessage.count({ where: { conversationId } }),
    ])

    return { messages: messages.reverse(), total, page, limit: take, totalPages: Math.ceil(total / take) }
  }

  /** Create a text or voice message */
  async createMessage(data: {
    conversationId: string
    senderId: string
    content?: string
    type: MessageType
    audioData?: string
    audioDuration?: number
  }) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: data.conversationId, userId: data.senderId } },
    })
    if (!participant) throw new ForbiddenException('Not a participant')

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type,
        audioData: data.audioData,
        audioDuration: data.audioDuration,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    })

    // Touch conversation updatedAt for sort order
    await this.prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    })

    return message
  }

  /** Mark a conversation as read */
  async markAsRead(conversationId: string, userId: string) {
    return this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    })
  }

  /** Get total unread chat count for a user */
  async getTotalUnread(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    })

    let total = 0
    for (const p of participants) {
      total += await this.prisma.chatMessage.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          createdAt: { gt: p.lastReadAt },
        },
      })
    }
    return { count: total }
  }
}
