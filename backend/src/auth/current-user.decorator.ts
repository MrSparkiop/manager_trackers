import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'USER' | 'PRO' | 'ADMIN'
  isImpersonated?: boolean
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
