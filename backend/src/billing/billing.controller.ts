import {
  Controller, Post, Get, Req, Body, Headers,
  UseGuards, HttpCode,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { BillingService } from './billing.service'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { NotImpersonatedGuard } from '../auth/not-impersonated.guard'

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  /** Public — returns Stripe publishable key for frontend */
  @Get('config')
  @ApiOperation({ summary: 'Get Stripe publishable key' })
  getConfig() {
    return this.billingService.getPublishableKey()
  }

  /** Authenticated — get current subscription status + invoices */
  @Get('subscription')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get subscription status and invoice history' })
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.billingService.getSubscription(user.id)
  }

  /** Authenticated — start a Stripe Checkout session */
  @Post('checkout')
  @UseGuards(AuthGuard('jwt'), NotImpersonatedGuard)
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  createCheckout(@CurrentUser() user: AuthUser) {
    return this.billingService.createCheckoutSession(user.id, user.email)
  }

  /** Authenticated — open customer portal to manage/cancel subscription */
  @Post('portal')
  @UseGuards(AuthGuard('jwt'), NotImpersonatedGuard)
  @ApiOperation({ summary: 'Open Stripe customer portal' })
  createPortal(@CurrentUser() user: AuthUser) {
    return this.billingService.createPortalSession(user.id)
  }

  /** Authenticated — start a 14-day free trial */
  @Post('start-trial')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Start a 14-day free trial of PRO' })
  startTrial(@CurrentUser() user: AuthUser) {
    return this.billingService.startTrial(user.id)
  }

  /** Public — Stripe webhook (needs raw body) */
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody!, sig)
  }
}
