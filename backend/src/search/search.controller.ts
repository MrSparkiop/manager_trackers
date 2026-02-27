import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '../prisma/prisma.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Search')
@UseGuards(AuthGuard('jwt'))
@Controller('search')
export class SearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async search(@Query('q') q: string, @Req() req: any) {
    if (!q || q.trim().length < 2) return { tasks: [], projects: [], teams: [], tags: [] }

    const userId = req.user.id
    const query = q.trim().toLowerCase()

    const [tasks, projects, teams, tags] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ]
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: { project: { select: { name: true, color: true } } }
      }),
      this.prisma.project.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ]
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, color: true, status: true, _count: { select: { tasks: true } } }
      }),
      this.prisma.team.findMany({
        where: {
          members: { some: { userId } },
          name: { contains: query, mode: 'insensitive' }
        },
        take: 5,
        select: { id: true, name: true, color: true, _count: { select: { members: true } } }
      }),
      this.prisma.tag.findMany({
        where: {
          userId,
          name: { contains: query, mode: 'insensitive' }
        },
        take: 5,
        select: { id: true, name: true, color: true }
      }),
    ])

    return { tasks, projects, teams, tags }
  }
}