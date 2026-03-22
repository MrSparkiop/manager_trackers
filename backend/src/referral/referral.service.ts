import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    })
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      select: { status: true, rewardApplied: true },
    })
    return {
      code: user?.referralCode,
      totalReferred: referrals.filter(r => r.status === 'COMPLETED').length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      rewardsEarned: referrals.filter(r => r.rewardApplied).length,
    }
  }

  async processReferral(referralCode: string, newUserId: string) {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    })
    if (!referrer || referrer.id === newUserId) return

    const referral = await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: newUserId,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Reward: extend referrer's trial by 30 days (or give 30 days if no trial)
    const referrerUser = await this.prisma.user.findUnique({ where: { id: referrer.id } })
    if (referrerUser) {
      const baseDate = referrerUser.trialEndsAt && referrerUser.trialEndsAt > new Date()
        ? referrerUser.trialEndsAt
        : new Date()
      const newTrialEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      await this.prisma.user.update({
        where: { id: referrer.id },
        data: { trialEndsAt: newTrialEnd, role: 'PRO' },
      })
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { rewardApplied: true },
      })
    }
  }
}
