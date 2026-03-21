import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { CalendarService } from './calendar.service'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto'

@ApiTags('calendar')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendar events' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.calendarService.findAll(user.id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new calendar event' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.create(user.id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a calendar event' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.calendarService.remove(user.id, id)
  }
}
