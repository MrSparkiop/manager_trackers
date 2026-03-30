import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ModerationService } from './moderation.service'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from '../admin/admin.guard'

@Controller('moderation')
@UseGuards(AuthGuard('jwt'))
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  reportMessage(
    @Request() req: any,
    @Body() body: { messageId: string; reason: string },
  ) {
    return this.moderationService.reportMessage(req.user.id, body.messageId, body.reason)
  }

  @Get('admin/reports')
  @UseGuards(AdminGuard)
  getReports(@Query('status') status?: string) {
    return this.moderationService.getReports(status)
  }

  @Get('admin/stats')
  @UseGuards(AdminGuard)
  getStats() {
    return this.moderationService.getStats()
  }

  @Post('admin/reports/:id/delete-message')
  @UseGuards(AdminGuard)
  deleteMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.moderationService.deleteMessage(req.user.id, id, body.note)
  }

  @Post('admin/reports/:id/warn')
  @UseGuards(AdminGuard)
  warnUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.moderationService.warnUser(req.user.id, id, body.note)
  }

  @Post('admin/reports/:id/suspend')
  @UseGuards(AdminGuard)
  suspendUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.moderationService.suspendUser(req.user.id, id, body.note)
  }

  @Post('admin/reports/:id/dismiss')
  @UseGuards(AdminGuard)
  dismissReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.moderationService.dismissReport(req.user.id, id, body.note)
  }
}
