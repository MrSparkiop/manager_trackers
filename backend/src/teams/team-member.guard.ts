import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TeamMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id
    const params = request.params ?? {}

    // Resolve team ID from various route params
    let teamId: string | undefined = params.id

    if (!teamId && params.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: params.projectId },
        select: { teamId: true },
      })
      if (!project) throw new NotFoundException('Project not found')
      teamId = project.teamId ?? undefined
    }

    if (!teamId && params.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: params.taskId },
        select: { teamId: true, project: { select: { teamId: true } } },
      })
      if (!task) throw new NotFoundException('Task not found')
      teamId = task.teamId ?? task.project?.teamId ?? undefined
    }

    if (!teamId && params.commentId) {
      const comment = await this.prisma.taskComment.findUnique({
        where: { id: params.commentId },
        select: { task: { select: { teamId: true } } },
      })
      if (!comment) throw new NotFoundException('Comment not found')
      teamId = comment.task?.teamId ?? undefined
    }

    // No team ID resolved — skip (list/create/join routes)
    if (!teamId) return true

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })

    if (!member) throw new ForbiddenException('You are not a member of this team')

    return true
  }
}
