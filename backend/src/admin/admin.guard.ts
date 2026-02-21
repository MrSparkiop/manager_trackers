import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id

    if (!userId) throw new ForbiddenException('Access denied')

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'ADMIN') throw new ForbiddenException('Admin access required')

    return true
  }
}