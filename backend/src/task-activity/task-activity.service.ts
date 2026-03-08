import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class TaskActivityService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ── ACTIVITY LOG ────────────────────────────────────────────────────────────

  async logActivity(data: {
    taskId: string
    actorId: string
    actorName: string
    actorEmail: string
    action: string
    field?: string
    oldValue?: string
    newValue?: string
  }) {
    return this.prisma.taskActivity.create({ data })
  }

  async getActivity(taskId: string, userId: string) {
    // Verify access — user owns the task OR is in a team that has the task
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Task not found')

    return this.prisma.taskActivity.findMany({
      where: { taskId },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  // ── COMMENTS ────────────────────────────────────────────────────────────────

  async getComments(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Task not found')

    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async addComment(taskId: string, userId: string, content: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Task not found')

    const actor = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!actor) throw new NotFoundException('User not found')

    const comment = await this.prisma.taskComment.create({
      data: { taskId, authorId: userId, content },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    // Log activity
    await this.logActivity({
      taskId,
      actorId: userId,
      actorName: `${actor.firstName} ${actor.lastName}`,
      actorEmail: actor.email,
      action: 'comment_added',
      newValue: content.slice(0, 100),
    })

    // Parse @mentions — format: @[Name](userId)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUserId = match[2]
      if (mentionedUserId !== userId) {
        await this.notifications.create({
          userId: mentionedUserId,
          type: 'TASK_MENTIONED',
          title: 'You were mentioned',
          message: `${actor.firstName} ${actor.lastName} mentioned you in a comment on "${task.title}"`,
          link: `/app/tasks`,
        })
      }
    }

    return comment
  }

  async deleteComment(taskId: string, commentId: string, userId: string) {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, taskId },
    })
    if (!comment) throw new NotFoundException('Comment not found')
    if (comment.authorId !== userId) throw new ForbiddenException('Not your comment')

    const actor = await this.prisma.user.findUnique({ where: { id: userId } })

    await this.prisma.taskComment.delete({ where: { id: commentId } })

    await this.logActivity({
      taskId,
      actorId: userId,
      actorName: `${actor!.firstName} ${actor!.lastName}`,
      actorEmail: actor!.email,
      action: 'comment_deleted',
    })

    return { deleted: true }
  }

  // ── ATTACHMENTS ─────────────────────────────────────────────────────────────

  async getAttachments(taskId: string, userId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Task not found')

    return this.prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async addAttachment(
    taskId: string,
    userId: string,
    file: { filename: string; mimeType: string; size: number; url: string },
  ) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } })
    if (!task) throw new NotFoundException('Task not found')

    const actor = await this.prisma.user.findUnique({ where: { id: userId } })

    const attachment = await this.prisma.taskAttachment.create({
      data: { taskId, uploaderId: userId, ...file },
    })

    await this.logActivity({
      taskId,
      actorId: userId,
      actorName: `${actor!.firstName} ${actor!.lastName}`,
      actorEmail: actor!.email,
      action: 'attachment_added',
      newValue: file.filename,
    })

    return attachment
  }

  async deleteAttachment(taskId: string, attachmentId: string, userId: string) {
    const attachment = await this.prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId },
    })
    if (!attachment) throw new NotFoundException('Attachment not found')
    if (attachment.uploaderId !== userId) throw new ForbiddenException('Not your attachment')

    const actor = await this.prisma.user.findUnique({ where: { id: userId } })

    await this.prisma.taskAttachment.delete({ where: { id: attachmentId } })

    await this.logActivity({
      taskId,
      actorId: userId,
      actorName: `${actor!.firstName} ${actor!.lastName}`,
      actorEmail: actor!.email,
      action: 'attachment_deleted',
      oldValue: attachment.filename,
    })

    return { deleted: true }
  }

  // ── TEAM MEMBERS for @mention autocomplete ───────────────────────────────────

  async getMentionableUsers(userId: string) {
    // Returns the current user themselves (solo app — for future team expand)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    // Also get all team members from teams the user belongs to
    const teamMemberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    })

    const usersMap = new Map<string, any>()
    if (user) usersMap.set(user.id, user)

    for (const membership of teamMemberships) {
      for (const member of membership.team.members) {
        usersMap.set(member.user.id, member.user)
      }
    }

    return Array.from(usersMap.values())
  }
}