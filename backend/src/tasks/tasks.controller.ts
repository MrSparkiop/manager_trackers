import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TasksService } from './tasks.service'
import { TaskOwnerGuard } from './task-owner.guard'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.tasksService.findAll(user.id, query)
  }

  @Get('today')
  getToday(@CurrentUser() user: AuthUser) {
    return this.tasksService.getTodayTasks(user.id)
  }

  @Get('overdue')
  getOverdue(@CurrentUser() user: AuthUser) {
    return this.tasksService.getOverdueTasks(user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.findOne(id, user.id)
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.create(user.id, dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.update(id, user.id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.remove(id, user.id)
  }

  @Post(':id/next-occurrence')
  createNextOccurrence(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.createNextOccurrence(id, user.id)
  }

  @Post(':id/skip-occurrence')
  skipNextOccurrence(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.skipNextOccurrence(id, user.id)
  }
}
