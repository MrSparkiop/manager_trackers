import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id
    const projectId = request.params?.id

    // No projectId in route — skip (POST /projects, GET /projects)
    if (!projectId) return true

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, deletedAt: true },
    })

    if (!project || project.deletedAt) throw new NotFoundException('Project not found')
    if (project.userId !== userId) throw new ForbiddenException('You do not own this project')

    return true
  }
}