import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'

// Paths that bypass maintenance mode (Stripe webhooks, admin endpoints, auth)
const BYPASS_PATHS = [
  '/api/billing/webhook',
  '/api/admin',
  '/api/auth/logout',
  '/api/maintenance',
]

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Always let bypass paths through
      const path = req.path
      if (BYPASS_PATHS.some(p => path.startsWith(p))) {
        return next()
      }

      const maintenanceConfig = await this.prisma.systemConfig.findUnique({
        where: { key: 'maintenanceMode' },
      })

      if (maintenanceConfig?.value !== 'true') {
        return next()
      }

      // Maintenance is on — check if the requester is an ADMIN
      const token =
        (req.cookies as any)?.access_token ||
        req.headers.authorization?.split(' ')[1]

      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: process.env.JWT_SECRET,
          })
          if (payload?.sub) {
            const user = await this.prisma.user.findUnique({
              where: { id: payload.sub },
              select: { role: true },
            })
            if (user?.role === 'ADMIN') {
              return next()
            }
          }
        } catch {
          // invalid/expired token — fall through to maintenance block
        }
      }

      const messageConfig = await this.prisma.systemConfig.findUnique({
        where: { key: 'maintenanceMessage' },
      })

      // Use next(err) — the correct Express pattern for async middleware errors.
      // Throwing inside an async middleware causes an unhandled rejection that
      // NestJS converts to a generic 500. next(err) routes through the exception
      // filter pipeline and returns the correct 503 response.
      return next(
        new ServiceUnavailableException(
          messageConfig?.value || 'Platform is under maintenance. Please try again later.',
        ),
      )
    } catch (err) {
      // Unexpected errors (e.g., DB timeout): swallow and let the request through
      // rather than taking down every route with a 500.
      next()
    }
  }
}
