import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ReferralService } from './referral.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@Controller('referrals')
@UseGuards(AuthGuard('jwt'))
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Get()
  getStats(@CurrentUser() user: AuthUser) {
    return this.referralService.getReferralStats(user.id)
  }
}
