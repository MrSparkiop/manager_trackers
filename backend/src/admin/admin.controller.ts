import { Controller, Get, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
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
  getStats() {
    return this.adminService.getStats()
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  getUsers(
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '20',
    @Query('search') search = '',
  ) {
    return this.adminService.getUsers(+page, +limit, search)
  }

  @Get('users/most-active')
  @ApiOperation({ summary: 'Get most active users' })
  getMostActiveUsers() {
    return this.adminService.getMostActiveUsers()
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(@Param('id') id: string, @Body() body: { role: 'USER' | 'ADMIN' }) {
    return this.adminService.updateUserRole(id, body.role)
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id)
  }
}