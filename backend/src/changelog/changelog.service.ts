import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ChangelogService {
  constructor(private prisma: PrismaService) {}

  async getUnseenEntries(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenChangelog: true },
    })
    const where = user?.lastSeenChangelog
      ? { publishedAt: { gt: user.lastSeenChangelog } }
      : {}
    return this.prisma.changelog.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: 10,
    })
  }

  async markSeen(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenChangelog: new Date() },
    })
    return { success: true }
  }

  async create(data: { version: string; title: string; content: string }) {
    return this.prisma.changelog.create({ data })
  }

  async remove(id: string) {
    return this.prisma.changelog.delete({ where: { id } })
  }

  async findAll() {
    return this.prisma.changelog.findMany({ orderBy: { publishedAt: 'desc' } })
  }
}
