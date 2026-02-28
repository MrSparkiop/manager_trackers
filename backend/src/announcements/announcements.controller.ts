import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AdminService } from '../admin/admin.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private adminService: AdminService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('active')
  getActive(@Req() req: any) {
    return this.adminService.getActiveAnnouncements(req.user?.role || 'USER')
  }
}
