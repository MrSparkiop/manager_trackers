import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { AdminGuard } from './admin.guard'
import { MaintenanceService } from './maintenance.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, MaintenanceService],
  exports: [AdminService, MaintenanceService],
})
export class AdminModule {}