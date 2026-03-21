import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getInsights(userId: string) {
    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const last30Start = new Date(now); last30Start.setDate(last30Start.getDate() - 29); last30Start.setHours(0, 0, 0, 0)
    const last7Start = new Date(now); last7Start.setDate(last7Start.getDate() - 6); last7Start.setHours(0, 0, 0, 0)

    const ctx = { userId, now, todayStart, weekStart, monthStart, last30Start, last7Start }

    const [
      summary,
      timePerProject,
      productiveByDay,
      focusThisWeek,
      completedByDay,
      projectWorkload,
      topTasksByTime,
      velocity,
      priorityDist,
    ] = await Promise.all([
      this.getSummary(ctx),
      this.getTimePerProject(ctx),
      this.getProductiveByDay(ctx),
      this.getFocusThisWeek(ctx),
      this.getCompletedByDay(ctx),
      this.getProjectWorkload(ctx),
      this.getTopTasksByTime(ctx),
      this.getVelocity(ctx),
      this.getPriorityDistribution(ctx),
    ])

    return { summary, timePerProject, productiveByDay, focusThisWeek, completedByDay, projectWorkload, topTasksByTime, velocity, priorityDist }
  }

  // ── Private analytics sub-methods ──────────────────────────────

  private async getSummary(ctx: AnalyticsContext) {
    const { userId, weekStart, monthStart, last7Start } = ctx

    const [statusCounts, totalTimeAgg, weekTimeAgg, monthTimeAgg, last7Agg, projectCount, completedThisWeek, overdue] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { userId, parentId: null },
        _count: { id: true },
      }),
      this.prisma.timeEntry.aggregate({ where: { userId, duration: { not: null } }, _sum: { duration: true } }),
      this.prisma.timeEntry.aggregate({ where: { userId, duration: { not: null }, startTime: { gte: weekStart } }, _sum: { duration: true } }),
      this.prisma.timeEntry.aggregate({ where: { userId, duration: { not: null }, startTime: { gte: monthStart } }, _sum: { duration: true } }),
      this.prisma.timeEntry.aggregate({ where: { userId, duration: { not: null }, startTime: { gte: last7Start } }, _sum: { duration: true } }),
      this.prisma.project.count({ where: { userId, deletedAt: null } }),
      this.prisma.task.count({ where: { userId, parentId: null, status: 'DONE', completedAt: { gte: weekStart } } }),
      this.prisma.task.count({ where: { userId, parentId: null, dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'CANCELLED'] } } }),
    ])

    const countMap: Record<string, number> = {}
    for (const row of statusCounts) countMap[row.status] = row._count.id
    const totalTasks = Object.values(countMap).reduce((a, b) => a + b, 0)
    const completedTasks = countMap['DONE'] ?? 0

    return {
      totalTasks,
      completedTasks,
      overdueTasks: overdue,
      inProgressTasks: countMap['IN_PROGRESS'] ?? 0,
      todoTasks: countMap['TODO'] ?? 0,
      completedThisWeek,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalTimeSeconds: totalTimeAgg._sum.duration ?? 0,
      weekTimeSeconds: weekTimeAgg._sum.duration ?? 0,
      monthTimeSeconds: monthTimeAgg._sum.duration ?? 0,
      avgDailyFocusSeconds: Math.round((last7Agg._sum.duration ?? 0) / 7),
      totalProjects: projectCount,
    }
  }

  private async getTimePerProject(ctx: AnalyticsContext) {
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: { userId: ctx.userId, duration: { not: null } },
      select: { duration: true, task: { select: { project: { select: { id: true, name: true, color: true } } } } },
    })
    const map: Record<string, { name: string; color: string; seconds: number }> = {}
    for (const e of timeEntries) {
      const proj = e.task?.project
      if (!proj) continue
      if (!map[proj.id]) map[proj.id] = { name: proj.name, color: proj.color, seconds: 0 }
      map[proj.id].seconds += e.duration ?? 0
    }
    return Object.values(map).sort((a, b) => b.seconds - a.seconds)
  }

  private async getProductiveByDay(ctx: AnalyticsContext) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { userId: ctx.userId, duration: { not: null }, startTime: { gte: ctx.last30Start } },
      select: { startTime: true, duration: true },
    })
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const e of entries) dayMap[e.startTime.getDay()] += e.duration ?? 0
    return dayNames.map((day, i) => ({ day, seconds: dayMap[i] }))
  }

  private async getFocusThisWeek(ctx: AnalyticsContext) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { userId: ctx.userId, duration: { not: null }, startTime: { gte: ctx.weekStart } },
      select: { startTime: true, duration: true },
    })
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ctx.weekStart); d.setDate(d.getDate() + i)
      const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999)
      const seconds = entries
        .filter(e => e.startTime >= d && e.startTime <= dEnd)
        .reduce((s, e) => s + (e.duration ?? 0), 0)
      return { day: dayNames[d.getDay()], date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), seconds }
    })
  }

  private async getCompletedByDay(ctx: AnalyticsContext) {
    const tasks = await this.prisma.task.findMany({
      where: { userId: ctx.userId, parentId: null, OR: [
        { completedAt: { gte: ctx.last30Start } },
        { createdAt: { gte: ctx.last30Start } },
      ]},
      select: { completedAt: true, createdAt: true },
    })
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(ctx.now); d.setDate(d.getDate() - (29 - i)); d.setHours(0, 0, 0, 0)
      const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999)
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: tasks.filter(t => t.completedAt && t.completedAt >= d && t.completedAt <= dEnd).length,
        created: tasks.filter(t => t.createdAt >= d && t.createdAt <= dEnd).length,
      }
    })
  }

  private async getProjectWorkload(ctx: AnalyticsContext) {
    const projects = await this.prisma.project.findMany({
      where: { userId: ctx.userId, deletedAt: null },
      include: { tasks: { select: { status: true } } },
    })
    return projects
      .map(p => ({
        name: p.name, color: p.color,
        todo: p.tasks.filter(t => t.status === 'TODO').length,
        inProgress: p.tasks.filter(t => t.status === 'IN_PROGRESS').length,
        done: p.tasks.filter(t => t.status === 'DONE').length,
        total: p.tasks.length,
      }))
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
  }

  private async getTopTasksByTime(ctx: AnalyticsContext) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { userId: ctx.userId, duration: { not: null } },
      select: { duration: true, task: { select: { id: true, title: true, project: { select: { name: true, color: true } } } } },
    })
    const map: Record<string, { title: string; seconds: number; projectName?: string; projectColor?: string }> = {}
    for (const e of entries) {
      if (!e.task) continue
      if (!map[e.task.id]) map[e.task.id] = { title: e.task.title, seconds: 0, projectName: e.task.project?.name, projectColor: e.task.project?.color }
      map[e.task.id].seconds += e.duration ?? 0
    }
    return Object.values(map).sort((a, b) => b.seconds - a.seconds).slice(0, 8)
  }

  private async getVelocity(ctx: AnalyticsContext) {
    const eightWeeksAgo = new Date(ctx.weekStart); eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 49)
    const tasks = await this.prisma.task.findMany({
      where: { userId: ctx.userId, parentId: null, completedAt: { gte: eightWeeksAgo } },
      select: { completedAt: true },
    })
    return Array.from({ length: 8 }, (_, w) => {
      const wStart = new Date(ctx.weekStart); wStart.setDate(wStart.getDate() - (7 - w) * 7)
      const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 7)
      return {
        week: wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: tasks.filter(t => t.completedAt && t.completedAt >= wStart && t.completedAt < wEnd).length,
      }
    })
  }

  private async getPriorityDistribution(ctx: AnalyticsContext) {
    const groups = await this.prisma.task.groupBy({
      by: ['priority'],
      where: { userId: ctx.userId, parentId: null },
      _count: { id: true },
    })
    const countMap: Record<string, number> = {}
    for (const g of groups) countMap[g.priority] = g._count.id
    return [
      { name: 'Urgent', value: countMap['URGENT'] ?? 0, color: '#f87171' },
      { name: 'High',   value: countMap['HIGH'] ?? 0,   color: '#fb923c' },
      { name: 'Medium', value: countMap['MEDIUM'] ?? 0, color: '#facc15' },
      { name: 'Low',    value: countMap['LOW'] ?? 0,    color: '#4ade80' },
    ]
  }
}

interface AnalyticsContext {
  userId: string
  now: Date
  todayStart: Date
  weekStart: Date
  monthStart: Date
  last30Start: Date
  last7Start: Date
}
