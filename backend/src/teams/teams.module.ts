import { Module } from '@nestjs/common'
import { TeamsController } from './teams.controller'
import { TeamsService } from './teams.service'
import { TeamMemberGuard } from './team-member.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, NotificationsModule, AuthModule],
  controllers: [TeamsController],
  providers: [TeamsService, TeamMemberGuard],
  exports: [TeamsService],
})
export class TeamsModule {}
