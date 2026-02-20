import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CalendarService } from './calendar.service'

@ApiTags('calendar')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendar events' })
  findAll(@Req() req: any) {
    return this.calendarService.findAll(req.user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new calendar event' })
  create(@Req() req: any, @Body() dto: any) {
    return this.calendarService.create(req.user.id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a calendar event' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.calendarService.remove(req.user.id, id)
  }
}