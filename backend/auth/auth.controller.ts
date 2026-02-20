import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import type { Response, Request } from 'express'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res)
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res)
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res)
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear cookies' })
  @ApiCookieAuth('access_token')
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res, req.user?.id)
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiCookieAuth('access_token')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id)
  }
}