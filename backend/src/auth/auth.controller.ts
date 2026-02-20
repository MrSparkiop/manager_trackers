import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import type { Response, Request } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res)
  }

  @Post('login')
  login(@Body() dto: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res)
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res)
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res, req.user?.id)
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id)
  }
}