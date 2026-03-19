import { Injectable } from '@nestjs/common'
import { AbilityBuilder, createMongoAbility, MongoAbility, subject } from '@casl/ability'

// ── Action and subject types ──────────────────────────────────────
export type AppActions  = 'manage' | 'create' | 'read' | 'update' | 'delete'
export type AppSubjects = 'Task' | 'Project' | 'TaskComment' | 'Team' | 'TeamMember' | 'all'
export type AppAbility  = MongoAbility<[AppActions, AppSubjects]>

// Helper: wrap a plain object so CASL knows its subject type
export { subject as caslSubject }

export interface TeamMembership {
  role: string
  customRole?: {
    canInviteMembers:  boolean
    canManageProjects: boolean
    canDeleteTasks:    boolean
    canManageSettings: boolean
  } | null
}

// ── Role level helper ─────────────────────────────────────────────
function roleLevel(role: string): number {
  const levels: Record<string, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3, OWNER: 4 }
  return levels[role] ?? 0
}

@Injectable()
export class CaslAbilityFactory {
  /**
   * Build an ability for the given user + their membership in a specific team.
   * Pass membership=null for non-team contexts (personal tasks, admin, etc.)
   *
   * Usage:
   *   const ability = caslFactory.createForUser(user, membership)
   *   ability.can('delete', caslSubject('TaskComment', { authorId: '...' }))
   */
  createForUser(
    user: { id: string; role: string },
    membership: TeamMembership | null = null,
  ): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    // Platform admins can do everything
    if (user.role === 'ADMIN') {
      can('manage', 'all')
      return build()
    }

    // Every authenticated user can read resources
    can('read', 'Task')
    can('read', 'Project')
    can('read', 'TaskComment')

    // Own comment: always editable/deletable (checked via caslSubject() at call site)
    can('delete', 'TaskComment', { authorId: user.id } as any)
    can('update', 'TaskComment', { authorId: user.id } as any)

    // Tasks assigned to the user can always be updated
    can('update', 'Task', { assigneeId: user.id } as any)

    if (!membership) return build()

    const level  = roleLevel(membership.role)
    const custom = membership.customRole

    // EDITOR+ (or custom role with task/project flags)
    if (level >= 2 || custom?.canManageProjects) {
      can('create', 'Task')
      can('create', 'TaskComment')
      can('create', 'Project')
      can('update', 'Project')
    }
    if (level >= 2 || custom?.canDeleteTasks) {
      can('update', 'Task')
      can('delete', 'Task')
    }

    // ADMIN+ (or custom role flags)
    if (level >= 3 || custom?.canManageProjects) {
      can('delete', 'Project')
    }
    if (level >= 3 || custom?.canInviteMembers) {
      can('update', 'Team')
    }
    if (level >= 3) {
      can('delete', 'TeamMember')
      can('delete', 'TaskComment') // moderate any comment
    }

    // OWNER only
    if (level >= 4) {
      can('manage', 'Team')
      can('manage', 'TeamMember')
    }

    return build()
  }
}
