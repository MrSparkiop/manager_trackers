import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { SupportService } from './support.service'
import { AdminGuard } from '../admin/admin.guard'

// ── User-facing support endpoints ───────────────────────────────────────────
@UseGuards(AuthGuard('jwt'))
@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  @Post('tickets')
  createTicket(@Req() req: any, @Body() body: any) {
    return this.service.createTicket(req.user.id, body)
  }

  @Get('tickets')
  getMyTickets(@Req() req: any) {
    return this.service.getMyTickets(req.user.id)
  }

  @Get('tickets/:id')
  getMyTicket(@Param('id') id: string, @Req() req: any) {
    return this.service.getMyTicket(id, req.user.id)
  }

  @Post('tickets/:id/replies')
  replyToTicket(@Param('id') id: string, @Req() req: any, @Body() body: { content: string }) {
    return this.service.replyToTicket(id, req.user.id, body.content)
  }

  @Put('tickets/:id/close')
  closeMyTicket(@Param('id') id: string, @Req() req: any) {
    return this.service.closeMyTicket(id, req.user.id)
  }
}

// ── Admin support endpoints ──────────────────────────────────────────────────
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private service: SupportService) {}

  @Get('stats')
  getStats() {
    return this.service.getTicketStats()
  }

  @Get('tickets')
  getAllTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getAllTickets({ status, priority, search })
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string) {
    return this.service.getTicket(id)
  }

  @Post('tickets/:id/replies')
  adminReply(@Param('id') id: string, @Req() req: any, @Body() body: { content: string }) {
    return this.service.adminReply(id, req.user.id, body.content)
  }

  @Put('tickets/:id')
  updateTicket(@Param('id') id: string, @Body() body: { status?: string; priority?: string }) {
    return this.service.updateTicket(id, body)
  }
}