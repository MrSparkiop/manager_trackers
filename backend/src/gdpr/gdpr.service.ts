import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import * as archiver from 'archiver'

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name)

  constructor(private prisma: PrismaService) {}

  /* ── helpers ───────────────────────────────────────────────── */

  /** Escape a value for CSV: wrap in quotes if it contains comma, quote, or newline */
  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  /** Convert an array of objects to a CSV string */
  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0])
    const headerLine = headers.map(h => this.csvEscape(h)).join(',')
    const dataLines = rows.map(row =>
      headers.map(h => this.csvEscape(row[h])).join(','),
    )
    return [headerLine, ...dataLines].join('\n')
  }

  /* ── export ────────────────────────────────────────────────── */

  async exportUserData(userId: string): Promise<Buffer> {
    // Gather all user data in parallel
    const [
      user,
      tasks,
      projects,
      timeEntries,
      calendarEvents,
      tags,
      teamMemberships,
      taskComments,
      notifications,
      supportTickets,
      ticketReplies,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.task.findMany({ where: { userId } }),
      this.prisma.project.findMany({ where: { userId } }),
      this.prisma.timeEntry.findMany({ where: { userId } }),
      this.prisma.calendarEvent.findMany({ where: { userId } }),
      this.prisma.tag.findMany({ where: { userId } }),
      this.prisma.teamMember.findMany({
        where: { userId },
        include: { team: { select: { name: true } } },
      }),
      this.prisma.taskComment.findMany({ where: { authorId: userId } }),
      this.prisma.notification.findMany({ where: { userId } }),
      this.prisma.supportTicket.findMany({ where: { userId } }),
      this.prisma.ticketReply.findMany({ where: { authorId: userId } }),
    ])

    // Build CSV files
    const files: { name: string; content: string }[] = []

    // Profile (exclude password, tokens)
    if (user) {
      const { password, refreshToken, resetPasswordToken, resetPasswordExpiry, ...safeUser } = user
      files.push({ name: 'profile.csv', content: this.toCsv([safeUser as Record<string, unknown>]) })
    }

    if (tasks.length > 0) {
      files.push({ name: 'tasks.csv', content: this.toCsv(tasks as unknown as Record<string, unknown>[]) })
    }

    if (projects.length > 0) {
      files.push({ name: 'projects.csv', content: this.toCsv(projects as unknown as Record<string, unknown>[]) })
    }

    if (timeEntries.length > 0) {
      files.push({ name: 'time_entries.csv', content: this.toCsv(timeEntries as unknown as Record<string, unknown>[]) })
    }

    if (calendarEvents.length > 0) {
      files.push({ name: 'calendar_events.csv', content: this.toCsv(calendarEvents as unknown as Record<string, unknown>[]) })
    }

    if (tags.length > 0) {
      files.push({ name: 'tags.csv', content: this.toCsv(tags as unknown as Record<string, unknown>[]) })
    }

    if (teamMemberships.length > 0) {
      const membershipsFlat = teamMemberships.map(m => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        teamId: m.teamId,
        teamName: m.team.name,
        customRoleId: m.customRoleId,
      }))
      files.push({ name: 'team_memberships.csv', content: this.toCsv(membershipsFlat as unknown as Record<string, unknown>[]) })
    }

    if (taskComments.length > 0) {
      files.push({ name: 'task_comments.csv', content: this.toCsv(taskComments as unknown as Record<string, unknown>[]) })
    }

    if (notifications.length > 0) {
      files.push({ name: 'notifications.csv', content: this.toCsv(notifications as unknown as Record<string, unknown>[]) })
    }

    if (supportTickets.length > 0) {
      files.push({ name: 'support_tickets.csv', content: this.toCsv(supportTickets as unknown as Record<string, unknown>[]) })
    }

    if (ticketReplies.length > 0) {
      files.push({ name: 'ticket_replies.csv', content: this.toCsv(ticketReplies as unknown as Record<string, unknown>[]) })
    }

    // Create ZIP buffer using archiver
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      const archive = archiver.default('zip', { zlib: { level: 9 } })

      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', (err: Error) => reject(err))

      for (const file of files) {
        archive.append(file.content, { name: file.name })
      }

      archive.finalize()
    })
  }

  /* ── deletion request ──────────────────────────────────────── */

  async requestDeletion(userId: string) {
    const now = new Date()
    const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: now,
        deletionScheduledFor: scheduledFor,
      },
    })

    return { scheduledFor }
  }

  async cancelDeletion(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
      },
    })

    return { success: true }
  }

  /* ── scheduled cleanup ─────────────────────────────────────── */

  @Cron('0 3 * * *')
  async handleScheduledDeletions() {
    const now = new Date()

    const usersToDelete = await this.prisma.user.findMany({
      where: {
        deletionScheduledFor: { lt: now },
      },
      select: { id: true, email: true },
    })

    for (const user of usersToDelete) {
      try {
        await this.prisma.user.delete({ where: { id: user.id } })
        this.logger.log(`Deleted user ${user.email} (scheduled GDPR deletion)`)
      } catch (err) {
        this.logger.error(`Failed to delete user ${user.email}: ${err}`)
      }
    }

    if (usersToDelete.length > 0) {
      this.logger.log(`GDPR cleanup: deleted ${usersToDelete.length} user(s)`)
    }
  }
}
