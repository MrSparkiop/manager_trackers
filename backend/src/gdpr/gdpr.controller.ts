import { Controller, Get, Post, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { GdprService } from './gdpr.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import type { Response } from 'express'

@Controller('gdpr')
@UseGuards(AuthGuard('jwt'))
export class GdprController {
  constructor(private gdprService: GdprService) {}

  @Get('export')
  async exportData(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const buffer = await this.gdprService.exportUserData(user.id)
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="trackflow-data-export.zip"`,
      'Content-Length': buffer.length,
    })
    res.send(buffer)
  }

  @Post('delete-account')
  requestDeletion(@CurrentUser() user: AuthUser) {
    return this.gdprService.requestDeletion(user.id)
  }

  @Post('cancel-deletion')
  cancelDeletion(@CurrentUser() user: AuthUser) {
    return this.gdprService.cancelDeletion(user.id)
  }
}
