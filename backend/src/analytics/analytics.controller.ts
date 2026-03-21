import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AnalyticsService } from './analytics.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'

@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('insights')
  getInsights(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getInsights(user.id)
  }
}
