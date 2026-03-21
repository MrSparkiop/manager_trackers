import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TimeTrackerService } from './time-tracker.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('time-tracker')
export class TimeTrackerController {
  constructor(private timeTrackerService: TimeTrackerService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.timeTrackerService.findAll(user.id);
  }

  @Get('running')
  getRunning(@CurrentUser() user: AuthUser) {
    return this.timeTrackerService.getRunning(user.id);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser) {
    return this.timeTrackerService.getSummary(user.id);
  }

  @Post('start')
  start(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: AuthUser) {
    return this.timeTrackerService.start(user.id, dto);
  }

  @Post('stop/:id')
  stop(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.timeTrackerService.stop(id, user.id);
  }

  @Post('manual')
  createManual(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: AuthUser) {
    return this.timeTrackerService.create(user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.timeTrackerService.remove(id, user.id);
  }
}
