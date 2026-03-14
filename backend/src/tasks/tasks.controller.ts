import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TasksService } from './tasks.service'
import { TaskOwnerGuard } from './task-owner.guard'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'

@UseGuards(AuthGuard('jwt'), TaskOwnerGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.tasksService.findAll(req.user.id, query)
  }

  @Get('today')
  getToday(@Req() req: any) {
    return this.tasksService.getTodayTasks(req.user.id)
  }

  @Get('overdue')
  getOverdue(@Req() req: any) {
    return this.tasksService.getOverdueTasks(req.user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.findOne(id, req.user.id)
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.tasksService.create(req.user.id, dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: any) {
    return this.tasksService.update(id, req.user.id, dto, req.user)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.remove(id, req.user.id)
  }

  @Post(':id/next-occurrence')
  createNextOccurrence(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.createNextOccurrence(id, req.user.id)
  }

  @Post(':id/skip-occurrence')
  skipNextOccurrence(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.skipNextOccurrence(id, req.user.id)
  }
}