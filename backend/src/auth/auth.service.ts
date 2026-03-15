import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import * as bcrypt from 'bcrypt'
import { createHash, timingSafeEqual } from 'crypto'
import * as crypto from 'crypto'
import type { Response } from 'express'

/** Fast, constant-time-safe SHA-256 hash for refresh tokens */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function verifyRefreshToken(token: string, stored: string): boolean {
  const hashed = Buffer.from(hashRefreshToken(token))
  const storedBuf = Buffer.from(stored)
  if (hashed.length !== storedBuf.length) return false
  return timingSafeEqual(hashed, storedBuf)
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  private generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId })

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d'
      }
    )

    return { accessToken, refreshToken }
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    })

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })
  }

  async register(dto: any, res: Response) {
    const regConfig = await this.prisma.systemConfig.findUnique({
      where: { key: 'disableRegistrations' }
    })
    if (regConfig?.value === 'true') {
      throw new ConflictException('New registrations are currently disabled')
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email already in use')

    const hashedPassword = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    })

    const { accessToken, refreshToken } = this.generateTokens(user.id)

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashRefreshToken(refreshToken) }
    })

    this.setAuthCookies(res, accessToken, refreshToken)
    return { user }
  }

  async login(dto: any, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    if (user.isSuspended) throw new UnauthorizedException('Your account has been suspended')
    const { accessToken, refreshToken } = this.generateTokens(user.id)

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashRefreshToken(refreshToken) }
    })

    this.setAuthCookies(res, accessToken, refreshToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    }
  }

  async refresh(req: any, res: Response) {
    const refreshToken = req.cookies?.refresh_token
    if (!refreshToken) throw new UnauthorizedException('No refresh token')

    // Verify refresh token signature
    let payload: any
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      })
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }

    // Find user and validate stored refresh token
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.refreshToken) throw new UnauthorizedException('Refresh token revoked')

    // Try SHA-256 first (tokens issued after the migration).
    // Fall back to bcrypt for tokens issued before the SHA-256 change so that
    // existing sessions keep working. On the next rotation the new token will
    // be stored as SHA-256, naturally upgrading every session.
    const sha256Valid = verifyRefreshToken(refreshToken, user.refreshToken)
    const bcryptValid = sha256Valid
      ? false
      : await bcrypt.compare(refreshToken, user.refreshToken).catch(() => false)

    if (!sha256Valid && !bcryptValid) {
      throw new UnauthorizedException('Refresh token mismatch')
    }

    // Generate new token pair (rotation)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = this.generateTokens(user.id)

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashRefreshToken(newRefreshToken) }
    })

    this.setAuthCookies(res, newAccessToken, newRefreshToken)

    return { success: true }
  }

  async logout(res: Response, userId?: string) {
    // Clear refresh token from DB if we have userId
    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null }
      }).catch(() => {}) // ignore if user not found
    }

    res.clearCookie('access_token', { path: '/' })
    res.clearCookie('refresh_token', { path: '/' })
    return { message: 'Logged out' }
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    })
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })

    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent' }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiry: expiry,
      }
    })

    await this.mailService.sendPasswordReset(user.email, user.firstName, token)

    return { message: 'If that email exists, a reset link has been sent' }
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: { gt: new Date() }
      }
    })

    if (!user) throw new UnauthorizedException('Invalid or expired reset token')

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        refreshToken: null, // invalidate all sessions
      }
    })

    return { message: 'Password reset successfully' }
  }
}