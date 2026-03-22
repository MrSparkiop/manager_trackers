import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationType } from '@prisma/client'

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async create(data: {
    userId: string
    type: string
    title: string
    message: string
    link?: string
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as NotificationType,
        title: data.title,
        message: data.message,
        link: data.link,
      }
    })
    // Send real-time notification
    this.gateway.sendNotification(data.userId, notification)
    return notification
  }

  async getMyNotifications(userId: string, page = 1, limit = 50) {
    const take = Math.min(100, Math.max(1, limit))
    const skip = (Math.max(1, page) - 1) * take

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ])

    return { notifications, total, page, limit: take, totalPages: Math.ceil(total / take) }
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true }
    })
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false }
    })
    return { count }
  }

  async deleteNotification(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId }
    })
  }
}