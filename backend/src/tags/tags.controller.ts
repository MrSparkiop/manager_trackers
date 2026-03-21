import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TagsService } from './tags.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@UseGuards(AuthGuard('jwt'))
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.tagsService.findAll(user.id)
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.tagsService.create(user.id, body)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    return this.tagsService.update(id, user.id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tagsService.remove(id, user.id)
  }

  @Post(':id/tasks/:taskId')
  addToTask(@Param('id') id: string, @Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.tagsService.addToTask(id, taskId, user.id)
  }

  @Delete(':id/tasks/:taskId')
  removeFromTask(@Param('id') id: string, @Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.tagsService.removeFromTask(id, taskId, user.id)
  }
}
