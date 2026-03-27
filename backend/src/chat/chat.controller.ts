import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions'
import { ChatService } from './chat.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('use:chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

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
  ) {
    return this.chatService.getMessages(id, user.id, parseInt(page || '1', 10))
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { content?: string; type?: string; audioData?: string; audioDuration?: number },
  ) {
    return this.chatService.createMessage({
      conversationId: id,
      senderId: user.id,
      content: body.content,
      type: (body.type as any) || 'TEXT',
      audioData: body.audioData,
      audioDuration: body.audioDuration,
    })
  }

  @Put('conversations/:id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.chatService.markAsRead(id, user.id)
  }

  @Get('unread')
  getUnread(@CurrentUser() user: AuthUser) {
    return this.chatService.getTotalUnread(user.id)
  }
}
