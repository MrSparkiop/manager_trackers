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
    detail:      (id: string) => ['team', id]                 as const,
    invite:      (id: string) => ['team-invite', id]          as const,
    tasks:       (projectId: string) =>
                   ['team-tasks', projectId]                   as const,
    workload:    (id: string) => ['team-workload', id]        as const,
    activity:    (id: string) => ['team-activity', id]        as const,
  },

  // ── Analytics ──────────────────────────────────────────────────
  analytics: {
    insights: ['analytics-insights'] as const,
  },

  // ── Admin ──────────────────────────────────────────────────────
  admin: {
    stats:          ['admin-stats']           as const,
    activeUsers:    ['admin-active-users']    as const,
    users:          ['admin-users']           as const,
    activity:       ['admin-activity']        as const,
    config:         ['admin-config']          as const,
    maintenance:    ['admin-maintenance']     as const,
    announcements:  ['admin-announcements']   as const,
    billing:        ['admin-billing']         as const,
    search:         ['admin-search']          as const,
    supportStats:   ['admin-support-stats']   as const,
    supportTickets: ['admin-support-tickets'] as const,
    userDetail:     (id: string) => ['admin-user', id] as const,
  },

  // ── Support ──────────────────────────────────────────────────
  support: {
    tickets: ['support-tickets'] as const,
  },

  // ── Billing ──────────────────────────────────────────────────
  billing: {
    subscription: ['billing-subscription'] as const,
  },

  // ── Chat ────────────────────────────────────────────────────
  chat: {
    conversations: ['chat-conversations'] as const,
    messages:      (id: string) => ['chat-messages', id] as const,
    users:         ['chat-users'] as const,
    unread:        ['chat-unread'] as const,
  },
} as const
