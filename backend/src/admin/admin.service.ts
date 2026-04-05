import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { AnnouncementType, TargetRole, Role } from '@prisma/client'
import * as os from 'os'
import Redis from 'ioredis'

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ── existing methods stay the same ──────────────────────────────

  // ── System Config ────────────────────────────────────────────────
  async getSystemConfig() {
    const configs = await this.prisma.systemConfig.findMany()

    // Build defaults if not set
    const defaults: Record<string, string> = {
      disableRegistrations: 'false',
      maintenanceMode:      'false',
      maintenanceMessage:   'We are currently performing scheduled maintenance. Please check back soon.',
      siteName:             'TrackFlow',
      maxUsersAllowed:      '0', // 0 = unlimited
    }

    const result: Record<string, string> = { ...defaults }
    configs.forEach(c => { result[c.key] = c.value })
    return result
  }

  async updateSystemConfig(key: string, value: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }

  async updateSystemConfigs(configs: Record<string, string>) {
    const updates = Object.entries(configs).map(([key, value]) =>
      this.prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
    await Promise.all(updates)
    return this.getSystemConfig()
  }

  // ── Announcements ────────────────────────────────────────────────
  async getAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  async getActiveAnnouncements(userRole: string) {
    return this.prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { targetRole: 'ALL' },
          { targetRole: userRole as TargetRole },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createAnnouncement(dto: { title: string; message: string; type?: string; targetRole?: string; isActive?: boolean }) {
    return this.prisma.announcement.create({
      data: {
        title:      dto.title || '',
        message:    dto.message,
        type:       (dto.type || 'INFO') as AnnouncementType,
        targetRole: (dto.targetRole || 'ALL') as TargetRole,
        isActive:   dto.isActive ?? true,
      },
    })
  }

  async updateAnnouncement(id: string, dto: { title?: string; message?: string; type?: string; targetRole?: string; isActive?: boolean }) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } })
    if (!announcement) throw new NotFoundException('Announcement not found')
    return this.prisma.announcement.update({
      where: { id },
      data: {
        title:      dto.title,
        message:    dto.message,
        type:       dto.type as AnnouncementType,
        targetRole: dto.targetRole as TargetRole,
        isActive:   dto.isActive,
      },
    })
  }

  async deleteAnnouncement(id: string) {
    return this.prisma.announcement.delete({ where: { id } })
  }

  // keep all existing methods below...
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
    const suspendedUsers = await this.prisma.user.count({ where: { isSuspended: true } })
    return {
      totalUsers, totalTasks, totalProjects, totalTimeEntries,
      completedTasks, activeProjects, newUsersThisWeek,
      signupsPerDay, suspendedUsers,
    }
  }

  async getUsers(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = search ? {
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

  async updateUser(adminId: string, userId: string, dto: { role?: string; firstName?: string; lastName?: string }) {
    // Prevent admin from changing their own role
    if (adminId === userId && dto.role && dto.role !== 'ADMIN') {
      throw new ForbiddenException('You cannot change your own admin role')
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role as Role,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true, email: true, firstName: true,
        lastName: true, role: true, isSuspended: true, createdAt: true,
      },
    })
  }

  async suspendUser(adminId: string, userId: string, suspend: boolean) {
    // Prevent admin from suspending themselves
    if (adminId === userId) {
      throw new ForbiddenException('You cannot suspend your own account')
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: suspend, refreshToken: suspend ? null : undefined },
      select: {
        id: true, email: true, firstName: true,
        lastName: true, role: true, isSuspended: true,
      },
    })
  }

  async deleteUser(adminId: string, userId: string) {
    // Prevent admin from deleting themselves
    if (adminId === userId) {
      throw new ForbiddenException('You cannot delete your own account')
    }
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

  async getActivityLog(page = 1, limit = 50) {
    const take = Math.min(100, Math.max(1, limit))
    const skip = (Math.max(1, page) - 1) * take

    // Fetch a reasonable window of recent items to assemble the activity feed
    const fetchLimit = Math.max(take * 3, 100)
    const [tasks, projects, users] = await Promise.all([
      this.prisma.task.findMany({
        orderBy: { createdAt: 'desc' }, take: fetchLimit,
        select: {
          id: true, title: true, status: true, createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }),
      this.prisma.project.findMany({
        orderBy: { createdAt: 'desc' }, take: fetchLimit,
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
    const allActivity = [
      ...tasks.map(t => ({
        id: `task-${t.id}`, type: 'task' as const,
        action: 'Created task', title: t.title, meta: t.status,
        user: t.user, createdAt: t.createdAt,
      })),
      ...projects.map(p => ({
        id: `project-${p.id}`, type: 'project' as const,
        action: 'Created project', title: p.name, meta: p.status,
        user: p.user, createdAt: p.createdAt,
      })),
      ...users.map(u => ({
        id: `user-${u.id}`, type: 'user' as const,
        action: 'Joined TrackFlow',
        title: `${u.firstName} ${u.lastName}`, meta: u.role,
        user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email },
        createdAt: u.createdAt,
      })),
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const total = allActivity.length
    const activity = allActivity.slice(skip, skip + take)
    return { activity, total, page, limit: take, totalPages: Math.ceil(total / take) }
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

  // ── Billing management ─────────────────────────────────────────────
  async getBillingOverview() {
    const raw = await this.prisma.user.findMany({
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isSuspended: true, createdAt: true,
        stripeSubscriptionId: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    })

    // Strip raw Stripe IDs — expose only a boolean flag
    const users = raw.map(({ stripeSubscriptionId, ...rest }) => ({
      ...rest,
      hasSubscription: stripeSubscriptionId !== null,
    }))

    const stats = {
      total: users.length,
      pro: users.filter(u => u.role === 'PRO').length,
      admin: users.filter(u => u.role === 'ADMIN').length,
      free: users.filter(u => u.role === 'USER').length,
    }

    return { users, stats }
  }

  async setUserRole(adminId: string, userId: string, role: string) {
    if (adminId === userId) throw new ForbiddenException('Cannot change your own role')
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })
  }

  // ── Admin Impersonation ───────────────────────────────────────────
  async impersonateUser(adminId: string, targetUserId: string, ip?: string) {
    if (adminId === targetUserId) throw new ForbiddenException('Cannot impersonate yourself')

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isSuspended: true },
    })
    if (!target) throw new NotFoundException('User not found')

    // Log the impersonation — immutable audit record
    await this.prisma.adminAuditLog.create({
      data: {
        action:       'IMPERSONATE',
        adminId,
        targetUserId,
        metadata:     { ip: ip ?? null, targetEmail: target.email },
      }
    })

    // Issue a 1-hour access token scoped to the target user.
    // The impersonatedBy claim lets the frontend show a banner and
    // lets server-side code detect impersonated sessions if needed.
    const token = this.jwtService.sign(
      { sub: targetUserId, impersonatedBy: adminId },
      { expiresIn: '1h' },
    )

    return {
      token,
      expiresIn: 3600,
      user: target,
    }
  }

  async getAuditLogs(limit = 50) {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getSystemHealth(chatMetrics: { onlineUsers: number; socketConnections: number }) {
    // DB check
    let dbStatus = 'ok'
    let dbLatencyMs = 0
    try {
      const t0 = Date.now()
      await this.prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - t0
    } catch {
      dbStatus = 'error'
    }

    // Redis check
    let redisStatus = 'ok'
    let redisLatencyMs = 0
    if (process.env.REDIS_URL) {
      const client = new Redis(process.env.REDIS_URL, { lazyConnect: true, connectTimeout: 3000 })
      try {
        const t0 = Date.now()
        await client.connect()
        await client.ping()
        redisLatencyMs = Date.now() - t0
      } catch {
        redisStatus = 'error'
      } finally {
        client.disconnect()
      }
    } else {
      redisStatus = 'not_configured'
    }

    // Memory
    const mem = process.memoryUsage()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    // CPU
    const loadAvg = os.loadavg()
    const cpuCount = os.cpus().length

    return {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db: { status: dbStatus, latencyMs: dbLatencyMs },
      redis: { status: redisStatus, latencyMs: redisLatencyMs },
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
        systemTotalMb: Math.round(totalMem / 1024 / 1024),
        systemFreeMb: Math.round(freeMem / 1024 / 1024),
        systemUsedPct: Math.round(((totalMem - freeMem) / totalMem) * 100),
      },
      cpu: {
        load1: parseFloat(loadAvg[0].toFixed(2)),
        load5: parseFloat(loadAvg[1].toFixed(2)),
        load15: parseFloat(loadAvg[2].toFixed(2)),
        cores: cpuCount,
        loadPct: Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100)),
      },
      sockets: chatMetrics,
    }
  }
}