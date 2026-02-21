import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, filters?: any) {
    const where: any = { userId, parentId: null };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.tagId) where.tags = { some: { id: filters.tagId } };

    return this.prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, color: true } },
        subtasks: { select: { id: true, title: true, status: true } },
        timeEntries: { select: { duration: true } },
        tags: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: {
        project: true,
        subtasks: true,
        timeEntries: true,
        tags: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(userId: string, dto: CreateTaskDto) {
    const { tagIds, ...rest } = dto as any
    return this.prisma.task.create({
      data: {
        ...rest,
        userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(tagIds?.length ? { tags: { connect: tagIds.map((id: string) => ({ id })) } } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tags: true,
      },
    })
  }


  async update(id: string, userId: string, dto: UpdateTaskDto) {
    await this.findOne(id, userId)
    const { tagIds, ...rest } = dto as any
    const data: any = {
      ...rest,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    }
    if (dto.status === TaskStatus.DONE) {
      data.completedAt = new Date()
    }
    if (tagIds !== undefined) {
      data.tags = { set: tagIds.map((id: string) => ({ id })) }
    }
    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true, color: true } },
        subtasks: true,
      },
    })
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.task.delete({ where: { id } });
  }

  async getTodayTasks(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: today, lt: tomorrow },
        status: { not: TaskStatus.DONE },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async getOverdueTasks(userId: string) {
    return this.prisma.task.findMany({
      where: {
        userId,
        dueDate: { lt: new Date() },
        status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    });
  }
}