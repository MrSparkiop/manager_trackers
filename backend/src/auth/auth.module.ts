import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './strategies/jwt.strategy'
import { RolesGuard } from './roles.guard'
import { PermissionsGuard } from './permissions.guard'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: (() => {
        const secret = process.env.JWT_SECRET
        if (!secret) throw new Error('FATAL: JWT_SECRET environment variable is not set')
        return secret
      })(),
      signOptions: { expiresIn: '15m' },
    }),
    MailModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, PermissionsGuard],
  controllers: [AuthController],
  exports: [AuthService, RolesGuard, PermissionsGuard],
})
export class AuthModule {}