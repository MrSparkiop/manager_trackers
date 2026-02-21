import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

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

    // New users last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const newUsersThisWeek = await this.prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    })

    // Signups per day for last 7 days
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

    return {
      totalUsers,
      totalTasks,
      totalProjects,
      totalTimeEntries,
      completedTasks,
      activeProjects,
      newUsersThisWeek,
      signupsPerDay,
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
          role: true, createdAt: true,
          _count: { select: { tasks: true, projects: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      this.prisma.user.count({ where })
    ])

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) }
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
}