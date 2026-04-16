import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PermissionsGuard } from '../auth/permissions.guard'
import { RequirePermissions } from '../auth/permissions'
import { ChangelogService } from './changelog.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { CreateChangelogDto } from './dto/create-changelog.dto'

@Controller('changelog')
@UseGuards(AuthGuard('jwt'))
export class ChangelogController {
  constructor(private changelogService: ChangelogService) {}

  @Get()
  getUnseen(@CurrentUser() user: AuthUser) {
    return this.changelogService.getUnseenEntries(user.id)
  }

  @Post('mark-seen')
  markSeen(@CurrentUser() user: AuthUser) {
    return this.changelogService.markSeen(user.id)
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  create(@Body() dto: CreateChangelogDto) {
    return this.changelogService.create(dto)
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('access:admin')
  remove(@Param('id') id: string) {
    return this.changelogService.remove(id)
  }
}
