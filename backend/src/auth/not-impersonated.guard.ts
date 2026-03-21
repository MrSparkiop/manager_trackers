import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

/**
 * Blocks endpoints that must not be accessible during admin impersonation sessions
 * (e.g. billing, password changes, account deletion).
 * Apply after AuthGuard('jwt').
 */
@Injectable()
export class NotImpersonatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    if (request.user?.isImpersonated) {
      throw new ForbiddenException('This action is not allowed during an impersonation session')
    }
    return true
  }
}
