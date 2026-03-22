import { Module } from '@nestjs/common'
import { TeamsController } from './teams.controller'
import { TeamsService } from './teams.service'
import { CustomRolesService } from './custom-roles.service'
import { TeamMemberGuard } from './team-member.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AuthModule } from '../auth/auth.module'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [PrismaModule, NotificationsModule, AuthModule, CommonModule],
  controllers: [TeamsController],
  providers: [TeamsService, CustomRolesService, TeamMemberGuard],
  exports: [TeamsService, CustomRolesService],
})
export class TeamsModule {}
