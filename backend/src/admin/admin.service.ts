import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, totalTasks, totalProjects, totalTimeEntries] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.task.count(),
      this.prisma.project.count(),
      this.prisma.timeEntry.count(),
    ])

    const completedTasks = await this.prisma.task.count({ where: { status: 'DONE' } })
    const activeProjects = await this.prisma.project.count({ where: { status: 'ACTIVE' } })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newUsersThisWeek = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    })

    const signupsPerDay = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        return this.prisma.user.count({
          where: { createdAt: { gte: date, lt: nextDate } }
        }).then(count => ({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count
        }))
      })
    )

    const suspendedUsers = await this.prisma.user.count({
      where: { isSuspended: true }
    })

    return {
      totalUsers, totalTasks, totalProjects, totalTimeEntries,
      completedTasks, activeProjects, newUsersThisWeek,
      signupsPerDay, suspendedUsers,
    }
  }

  async getUsers(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit
    const where: any = search ? {
      OR: [
        { email:     { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
      ]
    } : {}

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isSuspended: true, createdAt: true,
          _count: { select: { tasks: true, projects: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.user.count({ where })
    ])

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isSuspended: true, createdAt: true, updatedAt: true,
        _count: { select: { tasks: true, projects: true, timeEntries: true, calendarEvents: true, tags: true } },
        tasks: {
          orderBy: { createdAt: 'desc' }, take: 5,
          select: { id: true, title: true, status: true, priority: true, createdAt: true }
        },
        projects: {
          orderBy: { createdAt: 'desc' }, take: 5,
          select: { id: true, name: true, status: true, color: true, createdAt: true }
        },
      }
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async toggleSuspend(userId: string, isSuspended: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended,
        // Clear refresh token on suspend to force logout
        refreshToken: isSuspended ? null : undefined,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isSuspended: true }
    })
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    })
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } })
  }

  async getMostActiveUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true, email: true, firstName: true, lastName: true,
        _count: { select: { tasks: true, projects: true, timeEntries: true } }
      },
      orderBy: { tasks: { _count: 'desc' } },
      take: 10,
    })
  }

  async getActivityLog(page = 1, limit = 30) {
    const skip = (page - 1) * limit

    const [tasks, projects, users] = await Promise.all([
      this.prisma.task.findMany({
        orderBy: { createdAt: 'desc' }, take: limit,
        select: {
          id: true, title: true, status: true, createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }),
      this.prisma.project.findMany({
        orderBy: { createdAt: 'desc' }, take: limit,
        select: {
          id: true, name: true, status: true, createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' }, take: 20,
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, role: true }
      }),
    ])

    // Merge into unified activity feed
    const activity = [
      ...tasks.map(t => ({
        id: `task-${t.id}`, type: 'task' as const,
        action: 'Created task',
        title: t.title, meta: t.status,
        user: t.user, createdAt: t.createdAt,
      })),
      ...projects.map(p => ({
        id: `project-${p.id}`, type: 'project' as const,
        action: 'Created project',
        title: p.name, meta: p.status,
        user: p.user, createdAt: p.createdAt,
      })),
      ...users.map(u => ({
        id: `user-${u.id}`, type: 'user' as const,
        action: 'Joined TrackFlow',
        title: `${u.firstName} ${u.lastName}`,
        meta: u.role,
        user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email },
        createdAt: u.createdAt,
      })),
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(skip, skip + limit)

    return { activity, page, limit }
  }

  async globalSearch(query: string) {
    if (!query || query.length < 2) return { users: [], tasks: [], projects: [] }

    const [users, tasks, projects] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { email:     { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName:  { contains: query, mode: 'insensitive' } },
          ]
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isSuspended: true },
        take: 5,
      }),
      this.prisma.task.findMany({
        where: {
          OR: [
            { title:       { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true, title: true, status: true, priority: true,
          user: { select: { id: true, firstName: true, lastName: true } }
        },
        take: 5,
      }),
      this.prisma.project.findMany({
        where: {
          OR: [
            { name:        { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true, name: true, status: true, color: true,
          user: { select: { id: true, firstName: true, lastName: true } }
        },
        take: 5,
      }),
    ])

    return { users, tasks, projects }
  }
}