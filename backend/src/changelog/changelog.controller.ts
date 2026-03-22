import { Controller, Get, Post, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ChangelogService } from './changelog.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

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
  create(@CurrentUser() user: AuthUser, @Body() body: { version: string; title: string; content: string }) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only')
    return this.changelogService.create(body)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only')
    return this.changelogService.remove(id)
  }
}
