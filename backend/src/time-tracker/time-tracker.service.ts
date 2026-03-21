import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';

@Injectable()
export class TimeTrackerService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 50) {
    const take = Math.min(100, Math.max(1, limit))
    const skip = (Math.max(1, page) - 1) * take

    const [entries, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: { userId },
        include: { task: { select: { id: true, title: true } } },
        orderBy: { startTime: 'desc' },
        skip,
        take,
      }),
      this.prisma.timeEntry.count({ where: { userId } }),
    ])

    return { entries, total, page, limit: take, totalPages: Math.ceil(total / take) }
  }

  async getRunning(userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { userId, endTime: null },
      include: { task: { select: { id: true, title: true } } },
    });
  }

  async start(userId: string, dto: CreateTimeEntryDto) {
    const running = await this.getRunning(userId);
    if (running) throw new BadRequestException('A timer is already running. Stop it first.');

    return this.prisma.timeEntry.create({
      data: {
        ...dto,
        startTime: new Date(dto.startTime),
        userId,
      },
      include: { task: { select: { id: true, title: true } } },
    });
  }

  async stop(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.endTime) throw new BadRequestException('Timer already stopped');

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000);

    return this.prisma.timeEntry.update({
      where: { id },
      data: { endTime, duration },
      include: { task: { select: { id: true, title: true } } },
    });
  }

  async create(userId: string, dto: CreateTimeEntryDto) {
    if (!dto.endTime) throw new BadRequestException('endTime is required for manual entries');
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    return this.prisma.timeEntry.create({
      data: { ...dto, startTime: start, endTime: end, duration, userId },
    });
  }

  async remove(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Time entry not found');
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  async getSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const baseWhere = { userId, duration: { not: null } } as const;

    const [todayAgg, weekAgg, totalAgg] = await Promise.all([
      this.prisma.timeEntry.aggregate({ where: { ...baseWhere, startTime: { gte: today } }, _sum: { duration: true } }),
      this.prisma.timeEntry.aggregate({ where: { ...baseWhere, startTime: { gte: weekStart } }, _sum: { duration: true } }),
      this.prisma.timeEntry.aggregate({ where: baseWhere, _sum: { duration: true } }),
    ]);

    return {
      todaySeconds: todayAgg._sum.duration ?? 0,
      weekSeconds: weekAgg._sum.duration ?? 0,
      totalSeconds: totalAgg._sum.duration ?? 0,
    };
  }
}