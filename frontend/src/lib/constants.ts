// ── Priority colors ──────────────────────────────────────────────
export const priorityColors: Record<string, { bg: string; color: string }> = {
  URGENT: { bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
  HIGH:   { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  MEDIUM: { bg: 'rgba(234,179,8,0.15)',  color: '#facc15' },
  LOW:    { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80' },
}

// ── Task status config ───────────────────────────────────────────
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export const STATUSES   = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] as const

// ── Project color palette ────────────────────────────────────────
export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
]

// ── Duration formatting ──────────────────────────────────────────
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
