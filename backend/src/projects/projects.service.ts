import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        tasks: {
          include: { timeEntries: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { ...dto, userId },
    });
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    await this.findOne(id, userId);
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.project.delete({ where: { id } });
  }

  async getStats(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: { tasks: { select: { status: true } } },
    });

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      total: p.tasks.length,
      done: p.tasks.filter((t) => t.status === 'DONE').length,
      inProgress: p.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      todo: p.tasks.filter((t) => t.status === 'TODO').length,
    }));
  }
}