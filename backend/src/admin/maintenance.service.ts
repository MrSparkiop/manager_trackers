import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async getUpcoming() {
    const now = new Date()
    return this.prisma.maintenanceWindow.findFirst({
      where: {
        isActive: true,
        endTime: { gt: now },
      },
      orderBy: { startTime: 'asc' },
    })
  }

  async getAll() {
    return this.prisma.maintenanceWindow.findMany({
      orderBy: { startTime: 'desc' },
      take: 10,
    })
  }

  async create(dto: any) {
    return this.prisma.maintenanceWindow.create({
      data: {
        title: dto.title || 'Scheduled Maintenance',
        message: dto.message,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        isActive: true,
      },
    })
  }

  async update(id: string, dto: any) {
    return this.prisma.maintenanceWindow.update({
      where: { id },
      data: {
        title: dto.title,
        message: dto.message,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        isActive: dto.isActive,
      },
    })
  }

  async delete(id: string) {
    return this.prisma.maintenanceWindow.delete({ where: { id } })
  }

  async isInMaintenance(): Promise<{ active: boolean; message?: string; endTime?: Date }> {
    const now = new Date()
    const window = await this.prisma.maintenanceWindow.findFirst({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gt: now },
      },
    })
    if (!window) return { active: false }
    return { active: true, message: window.message, endTime: window.endTime }
  }
}
