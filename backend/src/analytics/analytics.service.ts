import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getInsights(userId: string) {
    const now = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const last30Start = new Date(now)
    last30Start.setDate(last30Start.getDate() - 29)
    last30Start.setHours(0, 0, 0, 0)

    const last7Start = new Date(now)
    last7Start.setDate(last7Start.getDate() - 6)
    last7Start.setHours(0, 0, 0, 0)

    const [tasks, timeEntries, projects] = await Promise.all([
      this.prisma.task.findMany({
        where: { userId, parentId: null },
        include: {
          project: { select: { id: true, name: true, color: true } },
          timeEntries: { select: { duration: true, startTime: true } },
        },
      }),
      this.prisma.timeEntry.findMany({
        where: { userId, duration: { not: null } },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { userId, deletedAt: null },
        include: { tasks: { select: { status: true } } },
      }),
    ])

    // 1. Time per project
    const projectTimeMap: Record<string, { name: string; color: string; seconds: number }> = {}
    for (const entry of timeEntries) {
      const proj = entry.task?.project
      if (!proj) continue
      if (!projectTimeMap[proj.id])
        projectTimeMap[proj.id] = { name: proj.name, color: proj.color, seconds: 0 }
      projectTimeMap[proj.id].seconds += entry.duration ?? 0
    }
    const timePerProject = Object.values(projectTimeMap).sort((a, b) => b.seconds - a.seconds)

    // 2. Task status counts
    const completedTasks = tasks.filter(t => t.status === 'DONE')
    const overdueTasks = tasks.filter(
      t => t.dueDate && t.dueDate < now && !['DONE', 'CANCELLED'].includes(t.status),
    )
    const completedThisWeek = completedTasks.filter(
      t => t.completedAt && t.completedAt >= weekStart,
    ).length

    // 3. Productive by day of week (last 30 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const entry of timeEntries) {
      if (entry.startTime >= last30Start) dayMap[entry.startTime.getDay()] += entry.duration ?? 0
    }
    const productiveByDay = dayNames.map((day, i) => ({ day, seconds: dayMap[i] }))

    // 4. Focus time this week (daily)
    const focusThisWeek = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const dEnd = new Date(d)
      dEnd.setHours(23, 59, 59, 999)
      const seconds = timeEntries
        .filter(e => e.startTime >= d && e.startTime <= dEnd)
        .reduce((s, e) => s + (e.duration ?? 0), 0)
      return {
        day: dayNames[d.getDay()],
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        seconds,
      }
    })

    // 5. Completed/created per day (last 30 days)
    const completedByDay = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (29 - i))
      d.setHours(0, 0, 0, 0)
      const dEnd = new Date(d)
      dEnd.setHours(23, 59, 59, 999)
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: tasks.filter(t => t.completedAt && t.completedAt >= d && t.completedAt <= dEnd).length,
        created: tasks.filter(t => t.createdAt >= d && t.createdAt <= dEnd).length,
      }
    })

    // 6. Project workload
    const projectWorkload = projects
      .map(p => ({
        name: p.name,
        color: p.color,
        todo: p.tasks.filter(t => t.status === 'TODO').length,
        inProgress: p.tasks.filter(t => t.status === 'IN_PROGRESS').length,
        done: p.tasks.filter(t => t.status === 'DONE').length,
        total: p.tasks.length,
      }))
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)

    // 7. Top tasks by time
    const taskTimeMap: Record<string, { title: string; seconds: number; projectName?: string; projectColor?: string }> = {}
    for (const entry of timeEntries) {
      if (!entry.task) continue
      const tid = entry.task.id
      if (!taskTimeMap[tid])
        taskTimeMap[tid] = {
          title: entry.task.title,
          seconds: 0,
          projectName: entry.task.project?.name,
          projectColor: entry.task.project?.color,
        }
      taskTimeMap[tid].seconds += entry.duration ?? 0
    }
    const topTasksByTime = Object.values(taskTimeMap).sort((a, b) => b.seconds - a.seconds).slice(0, 8)

    // 8. Weekly velocity (last 8 weeks)
    const velocity = Array.from({ length: 8 }, (_, w) => {
      const wStart = new Date(weekStart)
      wStart.setDate(wStart.getDate() - (7 - w) * 7)
      const wEnd = new Date(wStart)
      wEnd.setDate(wEnd.getDate() + 7)
      return {
        week: wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: tasks.filter(t => t.completedAt && t.completedAt >= wStart && t.completedAt < wEnd).length,
      }
    })

    // 9. Priority distribution
    const priorityDist = [
      { name: 'Urgent', value: tasks.filter(t => t.priority === 'URGENT').length, color: '#f87171' },
      { name: 'High',   value: tasks.filter(t => t.priority === 'HIGH').length,   color: '#fb923c' },
      { name: 'Medium', value: tasks.filter(t => t.priority === 'MEDIUM').length, color: '#facc15' },
      { name: 'Low',    value: tasks.filter(t => t.priority === 'LOW').length,    color: '#4ade80' },
    ]

    // 10. Summary
    const totalTimeSeconds = timeEntries.reduce((s, e) => s + (e.duration ?? 0), 0)
    const weekTimeSeconds = timeEntries.filter(e => e.startTime >= weekStart).reduce((s, e) => s + (e.duration ?? 0), 0)
    const monthTimeSeconds = timeEntries.filter(e => e.startTime >= monthStart).reduce((s, e) => s + (e.duration ?? 0), 0)
    const last7Seconds = timeEntries.filter(e => e.startTime >= last7Start).reduce((s, e) => s + (e.duration ?? 0), 0)

    return {
      summary: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        todoTasks: tasks.filter(t => t.status === 'TODO').length,
        completedThisWeek,
        completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
        totalTimeSeconds,
        weekTimeSeconds,
        monthTimeSeconds,
        avgDailyFocusSeconds: Math.round(last7Seconds / 7),
        totalProjects: projects.length,
      },
      timePerProject,
      productiveByDay,
      focusThisWeek,
      completedByDay,
      projectWorkload,
      topTasksByTime,
      velocity,
      priorityDist,
    }
  }
}
