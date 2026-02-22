import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  // ── Teams CRUD ───────────────────────────────────────────────────
  async getMyTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: { select: { members: true, projects: true } }
          }
        }
      }
    })
    return memberships.map(m => ({ ...m.team, myRole: m.role }))
  }

  async getTeam(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
          },
          orderBy: { joinedAt: 'asc' }
        },
        projects: {
          include: { _count: { select: { tasks: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!team) throw new NotFoundException('Team not found')

    const member = team.members.find(m => m.userId === userId)
    if (!member) throw new ForbiddenException('You are not a member of this team')

    return { ...team, myRole: member.role }
  }

  async createTeam(userId: string, dto: { name: string; description?: string; color?: string }) {
    // Check if user is PRO or ADMIN
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || (user.role !== 'PRO' && user.role !== 'ADMIN')) {
      throw new ForbiddenException('Only PRO users can create teams')
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color || '#6366f1',
        ownerId: userId,
      }
    })

    // Add owner as OWNER member
    await this.prisma.teamMember.create({
      data: { teamId: team.id, userId, role: 'OWNER' }
    })

    return team
  }

  async updateTeam(teamId: string, userId: string, dto: { name?: string; description?: string; color?: string }) {
    await this.requireOwner(teamId, userId)
    return this.prisma.team.update({
      where: { id: teamId },
      data: dto,
    })
  }

  async deleteTeam(teamId: string, userId: string) {
    await this.requireOwner(teamId, userId)
    return this.prisma.team.delete({ where: { id: teamId } })
  }

  // ── Invite Link ──────────────────────────────────────────────────
  async getInviteLink(teamId: string, userId: string) {
    await this.requireMember(teamId, userId)
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { inviteCode: true, name: true }
    })
    return { inviteCode: team!.inviteCode, teamName: team!.name }
  }

  async regenerateInviteCode(teamId: string, userId: string) {
    await this.requireOwner(teamId, userId)
    const { randomBytes } = await import('crypto')
    const newCode = randomBytes(16).toString('hex')
    return this.prisma.team.update({
      where: { id: teamId },
      data: { inviteCode: newCode },
      select: { inviteCode: true }
    })
  }

  async getTeamByInviteCode(inviteCode: string) {
    const team = await this.prisma.team.findUnique({
      where: { inviteCode },
      select: { id: true, name: true, description: true, color: true, _count: { select: { members: true } } }
    })
    if (!team) throw new NotFoundException('Invalid invite code')
    return team
  }

  async joinTeam(inviteCode: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { inviteCode } })
    if (!team) throw new NotFoundException('Invalid invite code')

    // Check if user is PRO or ADMIN
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || (user.role !== 'PRO' && user.role !== 'ADMIN')) {
      throw new ForbiddenException('Only PRO users can join teams. Upgrade your account to continue.')
    }

    if (team.ownerId === userId) throw new BadRequestException('You are already the owner of this team')

    // Catch race conditions at DB level
    try {
      await this.prisma.teamMember.create({
        data: { teamId: team.id, userId, role: 'MEMBER' }
      })
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('You are already a member of this team')
      throw e
    }

    return { message: `Successfully joined ${team.name}`, teamId: team.id }
  }

  async leaveTeam(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })
    if (!member) throw new NotFoundException('You are not a member of this team')
    if (member.role === 'OWNER') throw new BadRequestException('Team owner cannot leave. Transfer ownership or delete the team.')

    return this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } }
    })
  }

  async removeMember(teamId: string, userId: string, memberId: string) {
    await this.requireOwner(teamId, userId)
    if (userId === memberId) throw new BadRequestException('Cannot remove yourself')

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: memberId } }
    })
    if (!member) throw new NotFoundException('Member not found')

    return this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: memberId } }
    })
  }

  // ── Team Projects ────────────────────────────────────────────────
  async getTeamProjects(teamId: string, userId: string) {
    await this.requireMember(teamId, userId)
    return this.prisma.teamProject.findMany({
      where: { teamId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' }
    })
  }

  async createTeamProject(teamId: string, userId: string, dto: { name: string; description?: string; color?: string; deadline?: string }) {
    await this.requireMember(teamId, userId)
    return this.prisma.teamProject.create({
      data: {
        teamId,
        name: dto.name,
        description: dto.description,
        color: dto.color || '#6366f1',
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      }
    })
  }

  async updateTeamProject(projectId: string, userId: string, dto: any) {
    const project = await this.prisma.teamProject.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundException('Project not found')
    await this.requireMember(project.teamId, userId)
    return this.prisma.teamProject.update({
      where: { id: projectId },
      data: { ...dto, deadline: dto.deadline ? new Date(dto.deadline) : undefined }
    })
  }

  async deleteTeamProject(projectId: string, userId: string) {
    const project = await this.prisma.teamProject.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundException('Project not found')
    await this.requireOwner(project.teamId, userId)
    return this.prisma.teamProject.delete({ where: { id: projectId } })
  }

  // ── Team Tasks ───────────────────────────────────────────────────
  async getTeamTasks(projectId: string, userId: string) {
    const project = await this.prisma.teamProject.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundException('Project not found')
    await this.requireMember(project.teamId, userId)

    // Get team members for assignee info
    const members = await this.prisma.teamMember.findMany({
      where: { teamId: project.teamId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    })

    const tasks = await this.prisma.teamTask.findMany({
      where: { projectId },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    })

    return tasks.map(t => ({
      ...t,
      assignee: members.find(m => m.userId === t.assigneeId)?.user || null
    }))
  }

  async createTeamTask(projectId: string, userId: string, dto: {
    title: string; description?: string; priority?: string;
    dueDate?: string; assigneeId?: string
  }) {
    const project = await this.prisma.teamProject.findUnique({ where: { id: projectId } })
    if (!project) throw new NotFoundException('Project not found')
    await this.requireMember(project.teamId, userId)

    return this.prisma.teamTask.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority as any || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId || null,
      }
    })
  }

  async updateTeamTask(taskId: string, userId: string, dto: any) {
    const task = await this.prisma.teamTask.findUnique({
      where: { id: taskId },
      include: { project: true }
    })
    if (!task) throw new NotFoundException('Task not found')
    await this.requireMember(task.project.teamId, userId)

    return this.prisma.teamTask.update({
      where: { id: taskId },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: dto.status === 'DONE' ? new Date() : dto.status ? null : undefined,
      }
    })
  }

  async deleteTeamTask(taskId: string, userId: string) {
    const task = await this.prisma.teamTask.findUnique({
      where: { id: taskId },
      include: { project: true }
    })
    if (!task) throw new NotFoundException('Task not found')
    await this.requireMember(task.project.teamId, userId)
    return this.prisma.teamTask.delete({ where: { id: taskId } })
  }

  // ── Comments ─────────────────────────────────────────────────────
  async addComment(taskId: string, userId: string, content: string) {
    const task = await this.prisma.teamTask.findUnique({
      where: { id: taskId },
      include: { project: true }
    })
    if (!task) throw new NotFoundException('Task not found')
    await this.requireMember(task.project.teamId, userId)

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true }
    })

    return this.prisma.teamTaskComment.create({
      data: {
        taskId,
        userId,
        content,
        authorName: `${user!.firstName} ${user!.lastName}`,
        authorEmail: user!.email,
      }
    })
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.teamTaskComment.findUnique({ where: { id: commentId } })
    if (!comment) throw new NotFoundException('Comment not found')
    if (comment.userId !== userId) throw new ForbiddenException('Cannot delete others comments')
    return this.prisma.teamTaskComment.delete({ where: { id: commentId } })
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private async requireMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })
    if (!member) throw new ForbiddenException('You are not a member of this team')
    return member
  }

  private async requireOwner(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })
    if (!member || member.role !== 'OWNER') throw new ForbiddenException('Only team owner can do this')
    return member
  }
}