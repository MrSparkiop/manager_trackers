import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BillingService {
  private stripe: Stripe

  // Price IDs — create these in your Stripe test dashboard and paste here
  private readonly PRICE_IDS = {
    PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  }

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2026-02-25.clover',
    })
  }

  /** Create a Stripe Checkout session for upgrading to PRO */
  async createCheckoutSession(userId: string, userEmail: string) {
    if (!this.PRICE_IDS.PRO_MONTHLY) {
      throw new BadRequestException('Stripe price ID not configured')
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [{ price: this.PRICE_IDS.PRO_MONTHLY, quantity: 1 }],
      success_url: `${this.config.get('FRONTEND_URL')}/app/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/app/billing/cancel`,
      metadata: { userId },
    })

    return { url: session.url }
  }

  /** Create a Stripe Customer Portal session (manage / cancel subscription) */
  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found')
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.config.get('FRONTEND_URL')}/app/settings`,
    })

    return { url: session.url }
  }

  /** Handle incoming Stripe webhooks */
  async handleWebhook(rawBody: Buffer, signature: string) {
    const secrets = [
      this.config.get<string>('STRIPE_WEBHOOK_SECRET'),
      this.config.get<string>('STRIPE_WEBHOOK_SECRET_2'),
    ].filter(Boolean) as string[]

    if (!secrets.length) return { received: true } // skip in dev if not set

    let event: Stripe.Event | null = null
    for (const secret of secrets) {
      try {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, secret)
        break
      } catch {
        // try next secret
      }
    }
    if (!event) throw new BadRequestException('Invalid Stripe webhook signature')

    // Idempotency check — skip already-processed events
    const alreadyProcessed = await this.prisma.stripeEvent.findUnique({
      where: { id: event.id },
    })
    if (alreadyProcessed) return { received: true }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (userId) {
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              role: 'PRO',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await this.prisma.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { role: 'USER', stripeSubscriptionId: null },
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        if (customerId) {
          await this.prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { role: 'USER' },
          })
        }
        break
      }
    }

    // Record event so duplicates are skipped
    await this.prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    })

    return { received: true }
  }

  /** Return subscription status + invoices for the current user */
  async getSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, stripeSubscriptionId: true, role: true },
    })

    if (!user?.stripeSubscriptionId) {
      return { active: false, plan: user?.role ?? 'USER' }
    }

    const [sub, invoices] = await Promise.all([
      this.stripe.subscriptions.retrieve(user.stripeSubscriptionId),
      this.stripe.invoices.list({ customer: user.stripeCustomerId!, limit: 10 }),
    ])

    // current_period_end moved in newer Stripe API versions
    const periodEnd = (sub as any).current_period_end
      ?? sub.items?.data?.[0]?.current_period_end
      ?? null
    const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null

    return {
      active: sub.status === 'active',
      status: sub.status,
      plan: user.role,
      currentPeriodEnd: periodEndIso,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      amount: (sub.items.data[0]?.price?.unit_amount ?? 0) / 100,
      currency: sub.items.data[0]?.price?.currency ?? 'usd',
      invoices: invoices.data.map(inv => ({
        id: inv.id,
        number: inv.number,
        date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
        amount: (inv.amount_paid ?? 0) / 100,
        currency: inv.currency,
        status: inv.status,
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      })),
    }
  }

  /** Return the publishable key so the frontend can init Stripe.js */
  getPublishableKey() {
    return { publishableKey: this.config.get('STRIPE_PUBLISHABLE_KEY') }
  }
}
