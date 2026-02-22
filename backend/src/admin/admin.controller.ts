import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminGuard } from './admin.guard'
import { AdminService } from './admin.service'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

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

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(@Param('id') id: string, @Body() body: { role: 'USER' | 'PRO' | 'ADMIN' }) {
    return this.adminService.updateUserRole(id, body.role)
  }

  @Put('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend or unsuspend a user' })
  toggleSuspend(@Param('id') id: string, @Body() body: { isSuspended: boolean }) {
    return this.adminService.toggleSuspend(id, body.isSuspended)
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  deleteUser(@Param('id') id: string) { return this.adminService.deleteUser(id) }

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
  @ApiOperation({ summary: 'Get all announcements' })
  getAnnouncements() { return this.adminService.getAnnouncements() }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  createAnnouncement(@Body() body: { message: string; type: string }) {
    return this.adminService.createAnnouncement(body)
  }

  @Put('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  updateAnnouncement(
    @Param('id') id: string,
    @Body() body: { message?: string; type?: string; active?: boolean }
  ) { return this.adminService.updateAnnouncement(id, body) }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(id)
  }
}