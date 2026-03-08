import { Controller, Get, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AnalyticsService } from './analytics.service'

@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('insights')
  getInsights(@Req() req: any) {
    return this.analyticsService.getInsights(req.user.id)
  }
}
