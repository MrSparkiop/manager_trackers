import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import type { Response } from 'express'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    const { accessToken, refreshToken } = this.generateTokens(user.id)

    // Store hashed refresh token in DB
    const hashedRefresh = await bcrypt.hash(refreshToken, 10)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh }
    })

    this.setAuthCookies(res, accessToken, refreshToken)
    return { user }
  }

  async login(dto: any, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    const { accessToken, refreshToken } = this.generateTokens(user.id)

    // Store hashed refresh token in DB
    const hashedRefresh = await bcrypt.hash(refreshToken, 10)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh }
    })

    this.setAuthCookies(res, accessToken, refreshToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken)
    if (!isValid) throw new UnauthorizedException('Refresh token mismatch')

    // Generate new token pair (rotation)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = this.generateTokens(user.id)

    // Store new hashed refresh token
    const hashedRefresh = await bcrypt.hash(newRefreshToken, 10)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh }
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
      select: { id: true, email: true, firstName: true, lastName: true }
    })
  }
}