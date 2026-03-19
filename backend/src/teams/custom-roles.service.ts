import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CustomRolesService {
  constructor(private prisma: PrismaService) {}

  private async requireOwner(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } }
    })
    if (!member || member.role !== 'OWNER') {
      throw new ForbiddenException('Only the team owner can manage custom roles')
    }
  }

  async list(teamId: string) {
    return this.prisma.customTeamRole.findMany({
      where: { teamId },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async create(teamId: string, actorId: string, dto: {
    name: string
    canInviteMembers?: boolean
    canManageProjects?: boolean
    canDeleteTasks?: boolean
    canManageSettings?: boolean
  }) {
    await this.requireOwner(teamId, actorId)
    try {
      return await this.prisma.customTeamRole.create({
        data: {
          teamId,
          name: dto.name,
          canInviteMembers:  dto.canInviteMembers  ?? false,
          canManageProjects: dto.canManageProjects ?? false,
          canDeleteTasks:    dto.canDeleteTasks    ?? false,
          canManageSettings: dto.canManageSettings ?? false,
        }
      })
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException(`Role "${dto.name}" already exists in this team`)
      throw e
    }
  }

  async update(teamId: string, roleId: string, actorId: string, dto: {
    name?: string
    canInviteMembers?: boolean
    canManageProjects?: boolean
    canDeleteTasks?: boolean
    canManageSettings?: boolean
  }) {
    await this.requireOwner(teamId, actorId)
    const role = await this.prisma.customTeamRole.findUnique({ where: { id: roleId } })
    if (!role || role.teamId !== teamId) throw new NotFoundException('Custom role not found')

    return this.prisma.customTeamRole.update({ where: { id: roleId }, data: dto })
  }

  async remove(teamId: string, roleId: string, actorId: string) {
    await this.requireOwner(teamId, actorId)
    const role = await this.prisma.customTeamRole.findUnique({ where: { id: roleId } })
    if (!role || role.teamId !== teamId) throw new NotFoundException('Custom role not found')

    return this.prisma.customTeamRole.delete({ where: { id: roleId } })
  }

  async assignToMember(teamId: string, memberId: string, actorId: string, customRoleId: string | null) {
    await this.requireOwner(teamId, actorId)
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: memberId } }
    })
    if (!member) throw new NotFoundException('Member not found')

    if (customRoleId) {
      const role = await this.prisma.customTeamRole.findUnique({ where: { id: customRoleId } })
      if (!role || role.teamId !== teamId) throw new NotFoundException('Custom role not found')
    }

    return this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: memberId } },
      data: { customRoleId },
    })
  }
}
