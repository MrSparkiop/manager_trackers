import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  async reportMessage(reporterId: string, messageId: string, reason: string) {
    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } })
    if (!message) throw new NotFoundException('Message not found')
    if (message.senderId === reporterId) throw new ConflictException('Cannot report your own message')

    const existing = await this.prisma.messageReport.findFirst({
      where: { messageId, reporterId },
    })
    if (existing) throw new ConflictException('You already reported this message')

    return this.prisma.messageReport.create({
      data: { messageId, reporterId, reason },
    })
  }

  async getReports(status?: string) {
    return this.prisma.messageReport.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, email: true } },
            conversation: { select: { id: true } },
          },
        },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
  }

  async deleteMessage(adminId: string, reportId: string, note?: string) {
    const report = await this.prisma.messageReport.findUnique({
      where: { id: reportId },
      include: { message: true },
    })
    if (!report) throw new NotFoundException('Report not found')

    await this.prisma.chatMessage.delete({ where: { id: report.messageId } })
    await this.prisma.messageReport.update({
      where: { id: reportId },
      data: { status: 'DELETED', resolvedAt: new Date(), adminNote: note },
    })
    await this.prisma.adminAuditLog.create({
      data: {
        action: 'DELETE_CHAT_MESSAGE',
        adminId,
        targetUserId: report.message.senderId,
        metadata: { reportId, messageId: report.messageId },
      },
    })
    return { success: true }
  }

  async warnUser(adminId: string, reportId: string, note?: string) {
    const report = await this.prisma.messageReport.findUnique({
      where: { id: reportId },
      include: { message: true },
    })
    if (!report) throw new NotFoundException('Report not found')

    await this.prisma.messageReport.update({
      where: { id: reportId },
      data: { status: 'WARNED', resolvedAt: new Date(), adminNote: note },
    })
    await this.prisma.adminAuditLog.create({
      data: {
        action: 'WARN_USER_CHAT',
        adminId,
        targetUserId: report.message.senderId,
        metadata: { reportId },
      },
    })
    return { success: true }
  }

  async suspendUser(adminId: string, reportId: string, note?: string) {
    const report = await this.prisma.messageReport.findUnique({
      where: { id: reportId },
      include: { message: true },
    })
    if (!report) throw new NotFoundException('Report not found')

    await this.prisma.user.update({
      where: { id: report.message.senderId },
      data: { isSuspended: true },
    })
    await this.prisma.messageReport.update({
      where: { id: reportId },
      data: { status: 'WARNED', resolvedAt: new Date(), adminNote: note },
    })
    await this.prisma.adminAuditLog.create({
      data: {
        action: 'SUSPEND_USER',
        adminId,
        targetUserId: report.message.senderId,
        metadata: { reportId, reason: 'Chat report' },
      },
    })
    return { success: true }
  }

  async dismissReport(adminId: string, reportId: string, note?: string) {
    const report = await this.prisma.messageReport.findUnique({ where: { id: reportId } })
    if (!report) throw new NotFoundException('Report not found')

    await this.prisma.messageReport.update({
      where: { id: reportId },
      data: { status: 'DISMISSED', resolvedAt: new Date(), adminNote: note },
    })
    await this.prisma.adminAuditLog.create({
      data: {
        action: 'DISMISS_CHAT_REPORT',
        adminId,
        metadata: { reportId },
      },
    })
    return { success: true }
  }

  async getStats() {
    const [pending, warned, deleted, dismissed] = await Promise.all([
      this.prisma.messageReport.count({ where: { status: 'PENDING' } }),
      this.prisma.messageReport.count({ where: { status: 'WARNED' } }),
      this.prisma.messageReport.count({ where: { status: 'DELETED' } }),
      this.prisma.messageReport.count({ where: { status: 'DISMISSED' } }),
    ])
    return { pending, warned, deleted, dismissed, total: pending + warned + deleted + dismissed }
  }
}
