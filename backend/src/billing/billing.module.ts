import { Module } from '@nestjs/common'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { TrialExpiryCron } from './trial-expiry.cron'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, TrialExpiryCron],
})
export class BillingModule {}
