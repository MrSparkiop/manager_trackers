import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY, Role } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @Roles() decorator — route is open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) throw new UnauthorizedException('Authentication required')

    const hasRole = requiredRoles.includes(user.role)
    if (!hasRole) throw new ForbiddenException('Upgrade your account to access this feature')

    return true
  }
}