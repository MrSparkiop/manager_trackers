import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PlanLimitsService {
  static readonly FREE_LIMITS = { projects: 5, tasks: 100, teams: 1, teamMembers: 5 }

  constructor(private prisma: PrismaService) {}

  async checkProjectLimit(userId: string, userRole: string) {
    if (userRole === 'PRO' || userRole === 'ADMIN') return
    const count = await this.prisma.project.count({ where: { userId, deletedAt: null } })
    if (count >= PlanLimitsService.FREE_LIMITS.projects) {
      throw new ForbiddenException(`Free plan limit: ${PlanLimitsService.FREE_LIMITS.projects} projects. Upgrade to PRO for unlimited.`)
    }
  }

  async checkTaskLimit(userId: string, userRole: string) {
    if (userRole === 'PRO' || userRole === 'ADMIN') return
    const count = await this.prisma.task.count({ where: { userId, teamId: null } })
    if (count >= PlanLimitsService.FREE_LIMITS.tasks) {
      throw new ForbiddenException(`Free plan limit: ${PlanLimitsService.FREE_LIMITS.tasks} tasks. Upgrade to PRO for unlimited.`)
    }
  }

  async checkTeamLimit(userId: string, userRole: string) {
    if (userRole === 'PRO' || userRole === 'ADMIN') return
    const count = await this.prisma.team.count({ where: { ownerId: userId } })
    if (count >= PlanLimitsService.FREE_LIMITS.teams) {
      throw new ForbiddenException(`Free plan limit: ${PlanLimitsService.FREE_LIMITS.teams} team. Upgrade to PRO for unlimited.`)
    }
  }

  async checkTeamMemberLimit(teamId: string, ownerRole: string) {
    if (ownerRole === 'PRO' || ownerRole === 'ADMIN') return
    const count = await this.prisma.teamMember.count({ where: { teamId } })
    if (count >= PlanLimitsService.FREE_LIMITS.teamMembers) {
      throw new ForbiddenException(`Free plan limit: ${PlanLimitsService.FREE_LIMITS.teamMembers} team members. Upgrade to PRO for unlimited.`)
    }
  }
}
