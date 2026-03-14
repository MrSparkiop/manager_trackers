import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TaskOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id
    const taskId = request.params?.id

    // No taskId in route — skip (POST /tasks, GET /tasks)
    if (!taskId) return true

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    })

    if (!task) throw new NotFoundException('Task not found')
    if (task.userId !== userId) throw new ForbiddenException('You do not own this task')

    return true
  }
}