import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions'
import { SupportService } from './support.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { CreateTicketDto } from './dto/create-ticket.dto'

// ── User-facing support endpoints ────────────────────────────────
@UseGuards(AuthGuard('jwt'))
@Controller('support')
export class SupportController {
  constructor(private service: SupportService) {}

  @Post('tickets')
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.service.createTicket(user.id, dto)
  }

  @Get('tickets')
  getMyTickets(@CurrentUser() user: AuthUser) {
    return this.service.getMyTickets(user.id)
  }

  @Get('tickets/:id')
  getMyTicket(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getMyTicket(id, user.id)
  }

  @Post('tickets/:id/replies')
  replyToTicket(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { content: string }) {
    return this.service.replyToTicket(id, user.id, body.content)
  }

  @Put('tickets/:id/close')
  closeMyTicket(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.closeMyTicket(id, user.id)
  }
}

// ── Admin support endpoints ───────────────────────────────────────
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('access:admin')
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
  adminReply(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: { content: string }) {
    return this.service.adminReply(id, user.id, body.content)
  }

  @Put('tickets/:id')
  updateTicket(@Param('id') id: string, @Body() body: { status?: string; priority?: string }) {
    return this.service.updateTicket(id, body)
  }
}
