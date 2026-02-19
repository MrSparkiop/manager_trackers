import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CalendarService } from './calendar.service'
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto'

@UseGuards(AuthGuard('jwt'))
@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.calendarService.findAll(req.user.id)
  }

  @Post()
  create(@Body() dto: CreateCalendarEventDto, @Req() req: any) {
    return this.calendarService.create(req.user.id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.calendarService.remove(id, req.user.id)
  }
}