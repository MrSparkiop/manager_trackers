import { Module } from '@nestjs/common'
import { AnnouncementsController } from './announcements.controller'
import { AdminModule } from '../admin/admin.module'

@Module({
  imports: [AdminModule],
  controllers: [AnnouncementsController],
})
export class AnnouncementsModule {}