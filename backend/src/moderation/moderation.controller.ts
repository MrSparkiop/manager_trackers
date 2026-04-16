import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ModerationService } from './moderation.service'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { ReportMessageDto } from './dto/report-message.dto'
import { AdminActionDto } from './dto/admin-action.dto'

@Controller('moderation')
@UseGuards(AuthGuard('jwt'))
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  reportMessage(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReportMessageDto,
  ) {
    return this.moderationService.reportMessage(user.id, dto.messageId, dto.reason)
  }

  @Get('admin/reports')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  getReports(@Query('status') status?: string) {
    return this.moderationService.getReports(status)
  }

  @Get('admin/stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  getStats() {
    return this.moderationService.getStats()
  }

  @Post('admin/reports/:id/delete-message')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  deleteMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
  ) {
    return this.moderationService.deleteMessage(user.id, id, dto.note)
  }

  @Post('admin/reports/:id/warn')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  warnUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
  ) {
    return this.moderationService.warnUser(user.id, id, dto.note)
  }

  @Post('admin/reports/:id/suspend')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  suspendUser(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
  ) {
    return this.moderationService.suspendUser(user.id, id, dto.note)
  }

  @Post('admin/reports/:id/dismiss')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  dismissReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdminActionDto,
  ) {
    return this.moderationService.dismissReport(user.id, id, dto.note)
  }
}
