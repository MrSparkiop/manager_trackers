import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions'
import { AdminService } from './admin.service'
import { MaintenanceService } from './maintenance.service'
import { ChatGateway } from '../chat/chat.gateway'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { CreateAnnouncementDto } from './dto/create-announcement.dto'
import { UpdateAnnouncementDto } from './dto/update-announcement.dto'
import { AdminUpdateUserDto } from './dto/update-user.dto'
import { CreateMaintenanceDto } from './dto/create-maintenance.dto'
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto'
import { UpdateUserRoleDto } from './dto/update-user-role.dto'
import { SuspendUserDto } from './dto/suspend-user.dto'
import { UpdateSystemConfigsDto } from './dto/update-system-configs.dto'
import { Throttle } from '@nestjs/throttler'

@ApiTags('Admin')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequirePermissions('access:admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private maintenanceService: MaintenanceService,
    private chatGateway: ChatGateway,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform stats' })
  getStats() { return this.adminService.getStats() }

  @Get('system-health')
  @ApiOperation({ summary: 'Get system health metrics' })
  async getSystemHealth() { return this.adminService.getSystemHealth(await this.chatGateway.getMetrics()) }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  getUsers(
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '20',
    @Query('search') search = '',
  ) { return this.adminService.getUsers(+page, +limit, search) }

  @Get('users/most-active')
  @ApiOperation({ summary: 'Get most active users' })
  getMostActiveUsers() { return this.adminService.getMostActiveUsers() }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  getUserDetails(@Param('id') id: string) { return this.adminService.getUserDetails(id) }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update a user (role, name, etc.)' })
  updateUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(user.id, id, dto)
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update a user role' })
  updateUserRole(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUser(user.id, id, { role: dto.role })
  }

  @Put('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend or unsuspend a user' })
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  suspendUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(user.id, id, dto.suspend)
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  deleteUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.adminService.deleteUser(user.id, id)
  }

  // ── Billing management ───────────────────────────────────────────
  @Get('billing')
  @ApiOperation({ summary: 'Get all users with subscription info' })
  getBillingOverview() { return this.adminService.getBillingOverview() }

  @Post('billing/:userId/grant-pro')
  @ApiOperation({ summary: 'Manually grant PRO to a user' })
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  grantPro(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.adminService.setUserRole(user.id, userId, 'PRO')
  }

  @Post('billing/:userId/revoke-pro')
  @ApiOperation({ summary: 'Revoke PRO from a user' })
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  revokePro(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.adminService.setUserRole(user.id, userId, 'USER')
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get platform activity log' })
  getActivityLog(
    @Query('page')  page  = '1',
    @Query('limit') limit = '50',
  ) { return this.adminService.getActivityLog(+page, +limit) }

  @Get('search')
  @ApiOperation({ summary: 'Global search' })
  globalSearch(@Query('q') q = '') { return this.adminService.globalSearch(q.trim().slice(0, 200)) }

  // ── System Config ────────────────────────────────────────────────
  @Get('config')
  @ApiOperation({ summary: 'Get system config' })
  getSystemConfig() { return this.adminService.getSystemConfig() }

  @Put('config')
  @ApiOperation({ summary: 'Update system config (bulk)' })
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  updateSystemConfigs(@Body() dto: UpdateSystemConfigsDto) {
    return this.adminService.updateSystemConfigs(dto as Record<string, string>)
  }

  // ── Announcements ────────────────────────────────────────────────
  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements (admin management list)' })
  getAnnouncements() {
    return this.adminService.getAnnouncements()
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.adminService.createAnnouncement(dto)
  }

  @Put('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  updateAnnouncement(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.adminService.updateAnnouncement(id, dto)
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(id)
  }

  // ── Maintenance Windows ──────────────────────────────────────────
  @Get('maintenance')
  @ApiOperation({ summary: 'Get all maintenance windows' })
  getAllMaintenance() {
    return this.maintenanceService.getAll()
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Schedule a maintenance window' })
  createMaintenance(@Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(dto)
  }

  @Put('maintenance/:id')
  @ApiOperation({ summary: 'Update a maintenance window' })
  updateMaintenance(@Param('id') id: string, @Body() dto: UpdateMaintenanceDto) {
    return this.maintenanceService.update(id, dto)
  }

  @Delete('maintenance/:id')
  @ApiOperation({ summary: 'Delete a maintenance window' })
  deleteMaintenance(@Param('id') id: string) {
    return this.maintenanceService.delete(id)
  }

  // ── Impersonation ─────────────────────────────────────────────────
  @Post('impersonate/:userId')
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Generate a short-lived token scoped as the target user (logged to audit trail)' })
  impersonateUser(@Param('userId') userId: string, @Req() req: Request, @CurrentUser() user: AuthUser) {
    const ip = req.headers['x-forwarded-for'] as string ?? req.socket?.remoteAddress
    return this.adminService.impersonateUser(user.id, userId, ip)
  }

  // ── Audit Log ─────────────────────────────────────────────────────
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get recent admin audit log entries' })
  getAuditLogs(@Query('limit') limit?: string) {
    return this.adminService.getAuditLogs(limit ? parseInt(limit) : 50)
  }
}
