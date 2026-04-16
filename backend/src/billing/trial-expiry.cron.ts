import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TrialExpiryCron {
  private readonly logger = new Logger(TrialExpiryCron.name)

  constructor(private prisma: PrismaService) {}

  @Cron('0 * * * *') // every hour
  async expireTrials() {
    const result = await this.prisma.user.updateMany({
      where: {
        trialEndsAt: { lt: new Date() },
        role: 'PRO',
        stripeSubscriptionId: null,
      },
      data: { role: 'USER' },
    })
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} trial(s)`)
    }
  }
}
