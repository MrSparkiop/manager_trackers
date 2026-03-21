import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { Request } from 'express'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      // Extract JWT from HttpOnly cookie instead of Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = process.env.JWT_SECRET
        if (!secret) throw new Error('FATAL: JWT_SECRET environment variable is not set')
        return secret
      })(),
    })
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isSuspended: true },
    })
    if (!user) throw new UnauthorizedException()
    if (user.isSuspended) throw new UnauthorizedException('Account suspended')
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isSuspended: user.isSuspended,
      isImpersonated: !!payload.impersonatedBy,
    }
  }
}