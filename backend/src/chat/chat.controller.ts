import {
  Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UseGuards,
  UseInterceptors, UploadedFile, Res, BadRequestException, NotFoundException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions'
import { ChatService } from './chat.service'
import { ChatGateway } from './chat.gateway'
import { StorageService } from '../storage/storage.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import type { Response } from 'express'
import type { Express } from 'express'

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('use:chat')
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
    private storageService: StorageService,
  ) {}

  @Get('users')
  getChatUsers(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.chatService.getChatUsers(user.id, search)
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: AuthUser) {
    return this.chatService.getMyConversations(user.id)
  }

  @Post('conversations')
  startConversation(@CurrentUser() user: AuthUser, @Body() body: { userId: string }) {
    return this.chatService.getOrCreateConversation(user.id, body.userId)
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(id, user.id, parseInt(page || '1', 10), limit ? parseInt(limit, 10) : undefined)
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { content?: string; type?: string; audioData?: string; audioUrl?: string; audioDuration?: number },
  ) {
    return this.chatService.createMessage({
      conversationId: id,
      senderId: user.id,
      content: body.content,
      type: (body.type as any) || 'TEXT',
      audioData: body.audioData,
      audioUrl: body.audioUrl,
      audioDuration: body.audioDuration,
    })
  }

  @Patch('conversations/:convId/messages/:msgId')
  async editMessage(
    @Param('convId') convId: string,
    @Param('msgId') msgId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { content: string },
  ) {
    const msg = await this.chatService.editMessage(convId, msgId, user.id, body.content)
    this.chatGateway.server.to(`conversation:${convId}`).emit('message_updated', msg)
    return msg
  }

  @Delete('conversations/:convId/messages/:msgId')
  async deleteMessage(
    @Param('convId') convId: string,
    @Param('msgId') msgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const msg = await this.chatService.deleteMessage(convId, msgId, user.id)
    this.chatGateway.server.to(`conversation:${convId}`).emit('message_deleted', {
      id: msgId,
      conversationId: convId,
      deletedAt: msg.deletedAt,
    })
    return msg
  }

  @Put('conversations/:id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.chatService.markAsRead(id, user.id)
  }

  @Get('unread')
  getUnread(@CurrentUser() user: AuthUser) {
    return this.chatService.getTotalUnread(user.id)
  }

  // ── Voice audio upload ────────────────────────────────────────────

  @Post('audio')
  @UseInterceptors(FileInterceptor('audio', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No audio file provided')
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('Only audio files are accepted')
    }
    const key = await this.storageService.uploadAudio(file.buffer, file.mimetype)
    return { key }
  }

  @Get('audio/:key(*)')
  async streamAudio(@Param('key') key: string, @Res() res: Response) {
    try {
      const { stream, contentType } = await this.storageService.getAudioStream(key)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      stream.pipe(res)
    } catch {
      throw new NotFoundException('Audio not found')
    }
  }
}
