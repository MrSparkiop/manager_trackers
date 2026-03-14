import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { MaintenanceService } from './maintenance.service'
import { MaintenancePublicController } from './maintenance.public.controller'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, MaintenancePublicController],
  providers: [AdminService, MaintenanceService],
  exports: [AdminService, MaintenanceService],
})
export class AdminModule {}