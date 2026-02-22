import { Module } from '@nestjs/common'
import { AnnouncementsController } from './announcements.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AnnouncementsController],
})
export class AnnouncementsModule {}