import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from './admin.guard'
import { AdminService } from './admin.service'
import { MaintenanceService } from './maintenance.service'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private maintenanceService: MaintenanceService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform stats' })
  getStats() { return this.adminService.getStats() }

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
  updateUser(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateUser(req.user.id, id, dto)
  }

  @Put('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend or unsuspend a user' })
  suspendUser(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.adminService.suspendUser(req.user.id, id, dto.suspend)
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  deleteUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteUser(req.user.id, id)
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get platform activity log' })
  getActivityLog(
    @Query('page')  page  = '1',
    @Query('limit') limit = '30',
  ) { return this.adminService.getActivityLog(+page, +limit) }

  @Get('search')
  @ApiOperation({ summary: 'Global search' })
  globalSearch(@Query('q') q = '') { return this.adminService.globalSearch(q) }

  // ── System Config ────────────────────────────────────────────────
  @Get('config')
  @ApiOperation({ summary: 'Get system config' })
  getSystemConfig() { return this.adminService.getSystemConfig() }

  @Put('config')
  @ApiOperation({ summary: 'Update system config (bulk)' })
  updateSystemConfigs(@Body() body: Record<string, string>) {
    return this.adminService.updateSystemConfigs(body)
  }

  // ── Announcements ────────────────────────────────────────────────
  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements (admin management list)' })
  getAnnouncements() {
    return this.adminService.getAnnouncements()
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  createAnnouncement(@Body() dto: any) {
    return this.adminService.createAnnouncement(dto)
  }

  @Put('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  updateAnnouncement(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateAnnouncement(id, dto)
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(id)
  }

  // ── Maintenance Windows ──────────────────────────────────────────
  @Get('maintenance/upcoming')
  @ApiOperation({ summary: 'Get upcoming/active maintenance window (public)' })
  getUpcomingMaintenance() {
    return this.maintenanceService.getUpcoming()
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get all maintenance windows' })
  getAllMaintenance() {
    return this.maintenanceService.getAll()
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Schedule a maintenance window' })
  createMaintenance(@Body() dto: any) {
    return this.maintenanceService.create(dto)
  }

  @Put('maintenance/:id')
  @ApiOperation({ summary: 'Update a maintenance window' })
  updateMaintenance(@Param('id') id: string, @Body() dto: any) {
    return this.maintenanceService.update(id, dto)
  }

  @Delete('maintenance/:id')
  @ApiOperation({ summary: 'Delete a maintenance window' })
  deleteMaintenance(@Param('id') id: string) {
    return this.maintenanceService.delete(id)
  }
}