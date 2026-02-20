import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth, ApiQuery } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { TasksService } from './tasks.service'

@ApiTags('tasks')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Req() req: any, @Query() query: any) {
    return this.tasksService.findAll(req.user.id, query)
  }

  @Get('today')
  @ApiOperation({ summary: 'Get tasks due today' })
  findToday(@Req() req: any) {
    return this.tasksService.getTodayTasks(req.user.id)  // was findToday
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tasks' })
  findOverdue(@Req() req: any) {
    return this.tasksService.getOverdueTasks(req.user.id)  // was findOverdue 
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Req() req: any, @Body() dto: any) {
    return this.tasksService.create(req.user.id, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.tasksService.update(req.user.id, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.tasksService.remove(req.user.id, id)
  }
}