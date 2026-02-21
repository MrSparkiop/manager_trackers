import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TagsService } from './tags.service'

@UseGuards(AuthGuard('jwt'))
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.tagsService.findAll(req.user.id)
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.tagsService.create(req.user.id, body)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.tagsService.update(id, req.user.id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tagsService.remove(id, req.user.id)
  }

  @Post(':id/tasks/:taskId')
  addToTask(@Param('id') id: string, @Param('taskId') taskId: string, @Req() req: any) {
    return this.tagsService.addToTask(id, taskId, req.user.id)
  }

  @Delete(':id/tasks/:taskId')
  removeFromTask(@Param('id') id: string, @Param('taskId') taskId: string, @Req() req: any) {
    return this.tagsService.removeFromTask(id, taskId, req.user.id)
  }
}