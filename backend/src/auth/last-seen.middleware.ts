import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class LastSeenMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = (req.cookies as any)?.accessToken ||
        req.headers.authorization?.split(' ')[1]
      if (token) {
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET })
        if (payload?.sub) {
          // Update lastSeenAt without blocking the request
          this.prisma.user.update({
            where: { id: payload.sub },
            data: { lastSeenAt: new Date() }
          }).catch(() => {})
        }
      }
    } catch {}
    next()
  }
}
