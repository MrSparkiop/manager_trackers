import { Module } from '@nestjs/common'
import { SupportController, AdminSupportController } from './support.controller'
import { SupportService } from './support.service'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AdminModule } from '../admin/admin.module'

@Module({
  imports: [PrismaModule, NotificationsModule, AdminModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService],
})
export class SupportModule {}