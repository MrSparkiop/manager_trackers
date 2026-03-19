import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { MaintenanceService } from './maintenance.service'
import { MaintenancePublicController } from './maintenance.public.controller'
import { PrismaModule } from '../../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
    }),
  ],
  controllers: [AdminController, MaintenancePublicController],
  providers: [AdminService, MaintenanceService],
  exports: [AdminService, MaintenanceService],
})
export class AdminModule {}