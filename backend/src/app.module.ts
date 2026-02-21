import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProjectsModule } from './projects/projects.module'
import { TasksModule } from './tasks/tasks.module'
import { TimeTrackerModule } from './time-tracker/time-tracker.module'
import { CalendarModule } from './calendar/calendar.module'
import { TagsModule } from './tags/tags.module'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    TimeTrackerModule,
    CalendarModule,
    TagsModule,
    AdminModule,
  ],
})
export class AppModule {}