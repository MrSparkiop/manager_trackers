import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskOwnerGuard } from './task-owner.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TasksService, TaskOwnerGuard],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}