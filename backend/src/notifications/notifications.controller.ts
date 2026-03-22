import { Controller, Get, Put, Delete, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { NotificationsService } from './notifications.service'
import { ApiTags } from '@nestjs/swagger'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@ApiTags('Notifications')
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.notificationsService.getMyNotifications(user.id, +page, +limit)
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user.id)
  }

  @Put(':id/read')
  markAsRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id)
  }

  @Put('read-all')
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.id)
  }

  @Delete(':id')
  deleteNotification(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(user.id, id)
  }
}
