import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY, ROLE_PERMISSIONS, Permission } from './permissions'
import { Role } from './roles.decorator'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @RequirePermissions() — open to any authenticated user
    if (!required || required.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) throw new UnauthorizedException('Authentication required')

    const granted = ROLE_PERMISSIONS[user.role as Role] ?? []
    const hasAll = required.every(p => granted.includes(p))

    if (!hasAll) throw new ForbiddenException('Upgrade your account to access this feature')

    return true
  }
}
