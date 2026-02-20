import { Module } from '@nestjs/common'
import { CalendarService } from './calendar.service'
import { CalendarController } from './calendar.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
  providers: [CalendarService, PrismaService],
  controllers: [CalendarController],
})
export class CalendarModule {}