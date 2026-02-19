import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';

@Injectable()
export class TimeTrackerService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.timeEntry.findMany({
      where: { userId },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { startTime: 'desc' },
    });
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

    const [todayEntries, weekEntries, allEntries] = await Promise.all([
      this.prisma.timeEntry.findMany({ where: { userId, startTime: { gte: today }, duration: { not: null } } }),
      this.prisma.timeEntry.findMany({ where: { userId, startTime: { gte: weekStart }, duration: { not: null } } }),
      this.prisma.timeEntry.findMany({ where: { userId, duration: { not: null } } }),
    ]);

    const sum = (entries: any[]) => entries.reduce((acc, e) => acc + (e.duration || 0), 0);

    return {
      todaySeconds: sum(todayEntries),
      weekSeconds: sum(weekEntries),
      totalSeconds: sum(allEntries),
    };
  }
}