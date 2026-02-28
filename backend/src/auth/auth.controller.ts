import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiOperation } from '@nestjs/swagger'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import type { Response, Request } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 3 register attempts per minute
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('register')
  register(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res)
  }

  // 5 login attempts per minute
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res)
  }

  // Skip throttle for refresh since it runs automatically
  @SkipThrottle()
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res)
  }

  // Skip throttle for logout
  @SkipThrottle()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res, req.user?.id)
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id)
  }

  // 3 forgot password attempts per minute
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email)
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body.token, body.password)
  }
}
