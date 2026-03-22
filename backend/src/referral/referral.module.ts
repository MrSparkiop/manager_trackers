import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ReferralService } from './referral.service'
import { ReferralController } from './referral.controller'

@Module({
  imports: [PrismaModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
