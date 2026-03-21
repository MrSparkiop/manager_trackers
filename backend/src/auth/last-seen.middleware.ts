import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'

const THROTTLE_MS = 60_000 // 1 minute

@Injectable()
export class LastSeenMiddleware implements NestMiddleware {
  private lastUpdated = new Map<string, number>()

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = (req.cookies as any)?.access_token ||
        req.headers.authorization?.split(' ')[1]
      if (token) {
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET })
        if (payload?.sub) {
          const now = Date.now()
          const lastTime = this.lastUpdated.get(payload.sub) ?? 0
          if (now - lastTime > THROTTLE_MS) {
            this.lastUpdated.set(payload.sub, now)
            this.prisma.user.update({
              where: { id: payload.sub },
              data: { lastSeenAt: new Date() }
            }).catch(() => {})
          }
        }
      }
    } catch {}
    next()
  }
}
