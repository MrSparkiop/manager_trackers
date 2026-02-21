import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.tag.findMany({
      where: { userId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(userId: string, dto: { name: string; color: string }) {
    return this.prisma.tag.create({
      data: { name: dto.name, color: dto.color || '#6366f1', userId },
    })
  }

  async update(id: string, userId: string, dto: { name?: string; color?: string }) {
    const tag = await this.prisma.tag.findFirst({ where: { id, userId } })
    if (!tag) throw new NotFoundException('Tag not found')
    return this.prisma.tag.update({ where: { id }, data: dto })
  }

  async remove(id: string, userId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, userId } })
    if (!tag) throw new NotFoundException('Tag not found')
    return this.prisma.tag.delete({ where: { id } })
  }

  async addToTask(tagId: string, taskId: string, userId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, userId } })
    if (!tag) throw new NotFoundException('Tag not found')
    return this.prisma.task.update({
      where: { id: taskId },
      data: { tags: { connect: { id: tagId } } },
      include: { tags: true },
    })
  }

  async removeFromTask(tagId: string, taskId: string, userId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, userId } })
    if (!tag) throw new NotFoundException('Tag not found')
    return this.prisma.task.update({
      where: { id: taskId },
      data: { tags: { disconnect: { id: tagId } } },
      include: { tags: true },
    })
  }
}