import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto'

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.calendarEvent.findMany({
      where: { userId },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { startTime: 'asc' },
    })
  }

  async create(userId: string, dto: CreateCalendarEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        userId,
      },
      include: { task: { select: { id: true, title: true } } },
    })
  }

  async remove(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, userId } })
    if (!event) throw new NotFoundException('Event not found')
    return this.prisma.calendarEvent.delete({ where: { id } })
  }
}