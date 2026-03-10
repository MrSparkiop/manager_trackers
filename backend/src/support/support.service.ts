import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ── USER: create ticket ──────────────────────────────────────────
  async createTicket(userId: string, dto: {
    subject: string
    description: string
    category?: string
    priority?: string
  }) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category || 'general',
        priority: (dto.priority as any) || 'NORMAL',
      },
      include: { replies: { include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } } } },
    })
  }

  // ── USER: get my tickets ─────────────────────────────────────────
  async getMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        replies: {
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  // ── USER: get one ticket ─────────────────────────────────────────
  async getMyTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        replies: {
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    if (!ticket) throw new NotFoundException('Ticket not found')
    return ticket
  }

  // ── USER: reply to own ticket ────────────────────────────────────
  async replyToTicket(ticketId: string, userId: string, content: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, userId } })
    if (!ticket) throw new NotFoundException('Ticket not found')
    if (ticket.status === 'CLOSED') throw new ForbiddenException('Cannot reply to a closed ticket')

    const reply = await this.prisma.ticketReply.create({
      data: { ticketId, authorId: userId, content, isStaff: false },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    })

    // Reopen if it was resolved
    if (ticket.status === 'RESOLVED') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      })
    }

    return reply
  }

  // ── USER: close own ticket ───────────────────────────────────────
  async closeMyTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, userId } })
    if (!ticket) throw new NotFoundException('Ticket not found')
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED', closedAt: new Date() },
    })
  }

  // ── ADMIN: get all tickets ───────────────────────────────────────
  async getAllTickets(filters?: { status?: string; priority?: string; search?: string }) {
    const where: any = {}
    if (filters?.status) where.status = filters.status
    if (filters?.priority) where.priority = filters.priority
    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        replies: {
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
    })
  }

  // ── ADMIN: get one ticket ────────────────────────────────────────
  async getTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true } },
        replies: {
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!ticket) throw new NotFoundException('Ticket not found')
    return ticket
  }

  // ── ADMIN: reply to ticket ───────────────────────────────────────
  async adminReply(ticketId: string, staffId: string, content: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })
    if (!ticket) throw new NotFoundException('Ticket not found')

    const reply = await this.prisma.ticketReply.create({
      data: { ticketId, authorId: staffId, content, isStaff: true },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    })

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      })
    }

    // Notify the user
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } })
    await this.notifications.create({
      userId: ticket.userId,
      type: 'TASK_COMMENT', // reusing type — works fine
      title: 'Support ticket reply',
      message: `${staff!.firstName} ${staff!.lastName} replied to your ticket: "${ticket.subject}"`,
      link: `/app/support`,
    })

    return reply
  }

  // ── ADMIN: update ticket status/priority ─────────────────────────
  async updateTicket(ticketId: string, dto: { status?: string; priority?: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new NotFoundException('Ticket not found')

    const data: any = {}
    if (dto.status) data.status = dto.status
    if (dto.priority) data.priority = dto.priority
    if (dto.status === 'CLOSED' || dto.status === 'RESOLVED') data.closedAt = new Date()

    const updated = await this.prisma.supportTicket.update({ where: { id: ticketId }, data })

    // Notify user of status change
    if (dto.status && dto.status !== ticket.status) {
      await this.notifications.create({
        userId: ticket.userId,
        type: 'TASK_COMMENT',
        title: 'Support ticket updated',
        message: `Your ticket "${ticket.subject}" status changed to ${dto.status}`,
        link: `/app/support`,
      })
    }

    return updated
  }

  // ── ADMIN: stats ─────────────────────────────────────────────────
  async getTicketStats() {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    ])
    return { total, open, inProgress, resolved, closed }
  }
}