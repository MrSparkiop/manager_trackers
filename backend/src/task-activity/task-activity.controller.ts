import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, Req,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TaskActivityService } from './task-activity.service'
import { IsString } from 'class-validator'

class AddCommentDto {
  @IsString()
  content: string
}

class AddAttachmentDto {
  @IsString()
  filename: string
  @IsString()
  mimeType: string
  size: number
  @IsString()
  url: string
}

@UseGuards(AuthGuard('jwt'))
@Controller('tasks/:taskId')
export class TaskActivityController {
  constructor(private service: TaskActivityService) {}

  @Get('activity')
  getActivity(@Param('taskId') taskId: string, @Req() req: any) {
    return this.service.getActivity(taskId, req.user.id)
  }

  @Get('comments')
  getComments(@Param('taskId') taskId: string, @Req() req: any) {
    return this.service.getComments(taskId, req.user.id)
  }

  @Post('comments')
  addComment(
    @Param('taskId') taskId: string,
    @Body() dto: AddCommentDto,
    @Req() req: any,
  ) {
    return this.service.addComment(taskId, req.user.id, dto.content)
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    return this.service.deleteComment(taskId, commentId, req.user.id)
  }

  @Get('attachments')
  getAttachments(@Param('taskId') taskId: string, @Req() req: any) {
    return this.service.getAttachments(taskId, req.user.id)
  }

  @Post('attachments')
  addAttachment(
    @Param('taskId') taskId: string,
    @Body() dto: AddAttachmentDto,
    @Req() req: any,
  ) {
    return this.service.addAttachment(taskId, req.user.id, dto)
  }

  @Delete('attachments/:attachmentId')
  deleteAttachment(
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    return this.service.deleteAttachment(taskId, attachmentId, req.user.id)
  }

}