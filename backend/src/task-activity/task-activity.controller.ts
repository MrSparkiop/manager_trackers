import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { TaskActivityService } from './task-activity.service'
import { IsString } from 'class-validator'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

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
  getActivity(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.service.getActivity(taskId, user.id)
  }

  @Get('comments')
  getComments(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.service.getComments(taskId, user.id)
  }

  @Post('comments')
  addComment(
    @Param('taskId') taskId: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addComment(taskId, user.id, dto.content)
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deleteComment(taskId, commentId, user.id)
  }

  @Get('attachments')
  getAttachments(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.service.getAttachments(taskId, user.id)
  }

  @Post('attachments')
  addAttachment(
    @Param('taskId') taskId: string,
    @Body() dto: AddAttachmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addAttachment(taskId, user.id, dto)
  }

  @Delete('attachments/:attachmentId')
  deleteAttachment(
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deleteAttachment(taskId, attachmentId, user.id)
  }

}
