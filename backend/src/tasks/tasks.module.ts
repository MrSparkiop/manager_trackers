import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskOwnerGuard } from './task-owner.guard';

@Module({
  providers: [TasksService, TaskOwnerGuard],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}