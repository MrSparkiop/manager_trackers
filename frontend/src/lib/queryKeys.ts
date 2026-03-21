/**
 * Centralised query key factory.
 * Every React-Query cache key in the app should come from here so that
 * invalidation is consistent and easy to audit.
 */
export const queryKeys = {
  // ── Tasks ──────────────────────────────────────────────────────
  tasks: {
    all:      ['tasks'] as const,
    filtered: (status?: string, priority?: string, projectId?: string) =>
                ['tasks', status, priority, projectId] as const,
    today:    ['tasks', 'today']   as const,
    overdue:  ['tasks', 'overdue'] as const,
  },

  // ── Projects ───────────────────────────────────────────────────
  projects: {
    all: ['projects'] as const,
  },

  // ── Time tracker ───────────────────────────────────────────────
  timeTracker: {
    entries: ['time-entries'] as const,
    running: ['time-running']  as const,
    summary: ['time-summary']  as const,
  },

  // ── Calendar ───────────────────────────────────────────────────
  calendar: {
    events: ['calendar-events'] as const,
  },

  // ── Tags ───────────────────────────────────────────────────────
  tags: {
    all: ['tags'] as const,
  },

  // ── Notifications ──────────────────────────────────────────────
  notifications: {
    all:     ['notifications']        as const,
    unread:  ['notifications-unread'] as const,
  },

  // ── Teams ──────────────────────────────────────────────────────
  teams: {
    all:         ['teams']                                    as const,
    detail:      (id: string) => ['teams', id]                as const,
    projects:    (id: string) => ['teams', id, 'projects']    as const,
    tasks:       (teamId: string, projectId: string) =>
                   ['teams', teamId, 'tasks', projectId]      as const,
    workload:    (id: string) => ['teams', id, 'workload']    as const,
    activity:    (id: string) => ['teams', id, 'activity']    as const,
  },

  // ── Analytics ──────────────────────────────────────────────────
  analytics: {
    insights: ['analytics', 'insights'] as const,
  },

  // ── Admin ──────────────────────────────────────────────────────
  admin: {
    stats:         ['admin', 'stats']         as const,
    users:         ['admin', 'users']         as const,
    activity:      ['admin', 'activity']      as const,
    config:        ['admin', 'config']        as const,
    announcements: ['admin', 'announcements'] as const,
    billing:       ['admin', 'billing']       as const,
    search:        ['admin', 'search']        as const,
  },
} as const
