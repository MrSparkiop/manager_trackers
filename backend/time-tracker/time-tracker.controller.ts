import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { TimeTrackerService } from './time-tracker.service'

@ApiTags('time-tracker')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller('time-tracker')
export class TimeTrackerController {
  constructor(private timeTrackerService: TimeTrackerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all time entries' })
  findAll(@Req() req: any) {
    return this.timeTrackerService.findAll(req.user.id)
  }

  @Get('running')
  @ApiOperation({ summary: 'Get currently running timer' })
  findRunning(@Req() req: any) {
    return this.timeTrackerService.getRunning(req.user.id)  // was findRunning
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get time summary (today, week, total)' })
  getSummary(@Req() req: any) {
    return this.timeTrackerService.getSummary(req.user.id)
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a new timer' })
  start(@Req() req: any, @Body() dto: any) {
    return this.timeTrackerService.start(req.user.id, dto)
  }

  @Post('stop/:id')
  @ApiOperation({ summary: 'Stop a running timer' })
  stop(@Req() req: any, @Param('id') id: string) {
    return this.timeTrackerService.stop(req.user.id, id)
  }

  @Post('manual')
  @ApiOperation({ summary: 'Add a manual time entry' })
  manual(@Req() req: any, @Body() dto: any) {
    return this.timeTrackerService.create(req.user.id, dto)  // was manual
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a time entry' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.timeTrackerService.remove(req.user.id, id)
  }
}