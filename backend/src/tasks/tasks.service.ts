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
        recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : undefined,
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
      recurrenceEndDate: (dto as any).recurrenceEndDate ? new Date((dto as any).recurrenceEndDate) : undefined,
    }
    if (dto.status === TaskStatus.DONE) {
      data.completedAt = new Date()
    } else if (dto.status) {
      data.completedAt = null
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
        tags: true,
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

  async createNextOccurrence(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: { tags: true },
    })
    if (!task) throw new NotFoundException('Task not found')
    if (task.recurrence === 'NONE') throw new NotFoundException('Task is not recurring')

    const nextDueDate = this.getNextDueDate(task.dueDate, task.recurrence)

    if (task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) {
      return { message: 'Recurrence has ended', created: false }
    }

    const nextTask = await this.prisma.task.create({
      data: {
        userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'TODO',
        projectId: task.projectId,
        recurrence: task.recurrence,
        recurrenceEndDate: task.recurrenceEndDate,
        parentTaskId: task.parentTaskId || task.id,
        dueDate: nextDueDate,
        tags: { connect: task.tags.map(t => ({ id: t.id })) },
      },
      include: {
        project: { select: { name: true, color: true } },
        tags: true,
      },
    })

    return { message: 'Next occurrence created', created: true, task: nextTask }
  }

  async skipNextOccurrence(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: { tags: true },
    })
    if (!task) throw new NotFoundException('Task not found')
    if (task.recurrence === 'NONE') throw new NotFoundException('Task is not recurring')

    const skippedDate = this.getNextDueDate(task.dueDate, task.recurrence)
    const nextDueDate = this.getNextDueDate(skippedDate, task.recurrence)

    if (task.recurrenceEndDate && nextDueDate > task.recurrenceEndDate) {
      return { message: 'Recurrence has ended', created: false }
    }

    const nextTask = await this.prisma.task.create({
      data: {
        userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'TODO',
        projectId: task.projectId,
        recurrence: task.recurrence,
        recurrenceEndDate: task.recurrenceEndDate,
        parentTaskId: task.parentTaskId || task.id,
        dueDate: nextDueDate,
        tags: { connect: task.tags.map(t => ({ id: t.id })) },
      },
      include: {
        project: { select: { name: true, color: true } },
        tags: true,
      },
    })

    return { message: 'Occurrence skipped', created: true, task: nextTask }
  }

  private getNextDueDate(currentDue: Date | null, recurrence: string): Date {
    const base = currentDue ? new Date(currentDue) : new Date()
    switch (recurrence) {
      case 'DAILY':    base.setDate(base.getDate() + 1);       break
      case 'WEEKLY':   base.setDate(base.getDate() + 7);       break
      case 'BIWEEKLY': base.setDate(base.getDate() + 14);      break
      case 'MONTHLY':  base.setMonth(base.getMonth() + 1);     break
      case 'YEARLY':   base.setFullYear(base.getFullYear() + 1); break
    }
    return base
  }
}
