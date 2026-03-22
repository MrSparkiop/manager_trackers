import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ChangelogService } from './changelog.service'
import { ChangelogController } from './changelog.controller'

@Module({
  imports: [PrismaModule],
  controllers: [ChangelogController],
  providers: [ChangelogService],
})
export class ChangelogModule {}
