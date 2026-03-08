import { Module } from '@nestjs/common'
import { TaskActivityController } from './task-activity.controller'
import { TaskActivityService } from './task-activity.service'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TaskActivityController],
  providers: [TaskActivityService],
  exports: [TaskActivityService],
})
export class TaskActivityModule {}