import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskOwnerGuard } from './task-owner.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RecurringTasksScheduler } from './recurring-tasks.scheduler';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TasksService, TaskOwnerGuard, RecurringTasksScheduler],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}