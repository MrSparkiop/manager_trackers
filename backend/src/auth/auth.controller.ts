import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiOperation } from '@nestjs/swagger'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import type { Response, Request } from 'express'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { CurrentUser, type AuthUser } from './current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 3 register attempts per minute
  @Throttle({ medium: { ttl: 60000, limit: 3 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res)
  }

  // 5 login attempts per minute
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
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
  logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res, user?.id)
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id)
  }

  // 3 forgot password attempts per minute
  @Throttle({ medium: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  // 5 reset attempts per minute — prevents brute-force on reset tokens
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password)
  }

  @Post('complete-onboarding')
  @UseGuards(AuthGuard('jwt'))
  completeOnboarding(@CurrentUser() user: AuthUser) {
    return this.authService.completeOnboarding(user.id)
  }

  @Post('dismiss-warning')
  @UseGuards(AuthGuard('jwt'))
  dismissWarning(@CurrentUser() user: AuthUser) {
    return this.authService.dismissWarning(user.id)
  }
}
