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

      throw new ServiceUnavailableException(
        messageConfig?.value || 'Platform is under maintenance. Please try again later.',
      )
    } catch (err) {
      // Re-throw NestJS HTTP exceptions; swallow unexpected errors silently
      if ((err as any)?.status) throw err
      next()
    }
  }
}
