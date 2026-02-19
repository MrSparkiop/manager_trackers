import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TimeTrackerService } from './time-tracker.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('time-tracker')
export class TimeTrackerController {
  constructor(private timeTrackerService: TimeTrackerService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.timeTrackerService.findAll(req.user.id);
  }

  @Get('running')
  getRunning(@Req() req: any) {
    return this.timeTrackerService.getRunning(req.user.id);
  }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.timeTrackerService.getSummary(req.user.id);
  }

  @Post('start')
  start(@Body() dto: CreateTimeEntryDto, @Req() req: any) {
    return this.timeTrackerService.start(req.user.id, dto);
  }

  @Post('stop/:id')
  stop(@Param('id') id: string, @Req() req: any) {
    return this.timeTrackerService.stop(id, req.user.id);
  }

  @Post('manual')
  createManual(@Body() dto: CreateTimeEntryDto, @Req() req: any) {
    return this.timeTrackerService.create(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.timeTrackerService.remove(id, req.user.id);
  }
}