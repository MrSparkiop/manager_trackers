import { SetMetadata } from '@nestjs/common'
import { Role } from './roles.decorator'

// ── Permission definitions ────────────────────────────────────────
// Add new permissions here as the product grows.
// Never check roles directly in controllers — check permissions instead.
export type Permission =
  | 'create:team'   // Create a new team
  | 'join:team'     // Join a team via invite code
  | 'access:admin'  // Access the admin dashboard and support queues

// ── Role → Permission mapping ─────────────────────────────────────
// One place to change what each plan/role can do.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]:  [],
  [Role.PRO]:   ['create:team', 'join:team'],
  [Role.ADMIN]: ['create:team', 'join:team', 'access:admin'],
}

export const PERMISSIONS_KEY = 'permissions'
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)
