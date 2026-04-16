import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsService } from '../common/plan-limits.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus, Priority, Prisma } from '@prisma/client';
import { createNextOccurrence as createNext, skipNextOccurrence as skipNext } from '../common/recurrence.utils';

export interface TaskFilters {
  status?: string
  priority?: string
  projectId?: string
  tagId?: string
  page?: string
  limit?: string
}

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private planLimits: PlanLimitsService,
  ) {}

  async findAll(userId: string, filters?: TaskFilters) {
    const where: Prisma.TaskWhereInput = { userId, teamId: null, parentId: null };
    if (filters?.status) where.status = filters.status as TaskStatus;
    if (filters?.priority) where.priority = filters.priority as Priority;
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.tagId) where.tags = { some: { id: filters.tagId } };

    const page = Math.max(1, parseInt(filters?.page || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(filters?.limit || '50', 10) || 50))
    const skip = (page - 1) * limit

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, color: true } },
          subtasks: { select: { id: true, title: true, status: true } },
          timeEntries: { select: { duration: true } },
          tags: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ])

    return { tasks, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId, teamId: null },
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

  async create(userId: string, dto: CreateTaskDto, userRole?: string) {
    if (userRole) await this.planLimits.checkTaskLimit(userId, userRole)
    const { tagIds, ...rest } = dto

    // Fetch actor first so the $use middleware can log the creation
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    const doCreate = () => this.prisma.task.create({
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

    return actor ? this.prisma.runWithActor(actor, doCreate) : doCreate()
  }

  async update(id: string, userId: string, dto: UpdateTaskDto, actor?: { id: string; firstName: string; lastName: string; email: string }) {
    await this.findOne(id, userId)
    const { tagIds, ...rest } = dto
    const data: Prisma.TaskUpdateInput = {
      ...rest,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : undefined,
    }
    if (dto.status === TaskStatus.DONE) {
      data.completedAt = new Date()
    } else if (dto.status) {
      data.completedAt = null
    }
    if (tagIds !== undefined) {
      data.tags = { set: tagIds.map((id: string) => ({ id })) }
    }

    const doUpdate = () => this.prisma.task.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true, color: true } },
        subtasks: true,
        tags: true,
      },
    })

    // The $use middleware handles diff detection and activity logging automatically
    return actor ? this.prisma.runWithActor(actor, doUpdate) : doUpdate()
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.task.delete({ where: { id } });
  }

  async bulkRemove(ids: string[], userId: string) {
    if (!ids?.length) return { count: 0 }
    if (ids.length > 100) throw new BadRequestException('Max 100 tasks per bulk delete')
    const result = await this.prisma.task.deleteMany({
      where: { id: { in: ids }, userId, teamId: null },
    })
    return { count: result.count }
  }

  async getTodayTasks(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.task.findMany({
      where: {
        userId,
        teamId: null,
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
        teamId: null,
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
    return createNext(this.prisma, task, { connectTags: true })
  }

  async skipNextOccurrence(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: { tags: true },
    })
    if (!task) throw new NotFoundException('Task not found')
    return skipNext(this.prisma, task, { connectTags: true })
  }

}
