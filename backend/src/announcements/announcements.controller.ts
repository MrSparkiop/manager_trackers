import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminService } from '../admin/admin.service'
import { ApiTags } from '@nestjs/swagger'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private adminService: AdminService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('active')
  getActive(@CurrentUser() user: AuthUser) {
    return this.adminService.getActiveAnnouncements(user?.role || 'USER')
  }
}
