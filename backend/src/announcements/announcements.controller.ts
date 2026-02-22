import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private prisma: PrismaService) {}

  @Get('active')
  getActive() {
    return this.prisma.announcement.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    })
  }
}