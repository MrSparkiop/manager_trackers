import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProjectsModule } from './projects/projects.module'
import { TasksModule } from './tasks/tasks.module'
import { TimeTrackerModule } from './time-tracker/time-tracker.module'
import { CalendarModule } from './calendar/calendar.module'
import { TagsModule } from './tags/tags.module'
import { AdminModule } from './admin/admin.module'
import { AnnouncementsModule } from './announcements/announcements.module'
import { TeamsModule } from './teams/teams.module'
import { NotificationsModule } from './notifications/notifications.module'
import { LastSeenMiddleware } from './auth/last-seen.middleware'
import { MaintenanceMiddleware } from './auth/maintenance.middleware'
import { SearchModule } from './search/search.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { TaskActivityModule } from './task-activity/task-activity.module'
import { SupportModule } from './support/support.module'
import { BillingModule } from './billing/billing.module'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD } from '@nestjs/core'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'medium',
        ttl: 60000,
        limit: 200, // generous for normal API polling; auth endpoints override this
      },
    ]),
    JwtModule.register({ secret: process.env.JWT_SECRET, global: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    TimeTrackerModule,
    CalendarModule,
    TagsModule,
    AdminModule,
    AnnouncementsModule,
    TeamsModule,
    NotificationsModule,
    SearchModule,
    AnalyticsModule,
    TaskActivityModule,
    SupportModule,
    BillingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).forRoutes('*')
    consumer.apply(LastSeenMiddleware).forRoutes('*')
  }
}
