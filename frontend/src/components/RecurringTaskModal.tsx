import { X, RefreshCw, SkipForward, Check } from 'lucide-react'

interface Props {
  task: any
  isDark: boolean
  onConfirm: () => void
  onSkip: () => void
  onDismiss: () => void
  isLoading: boolean
}

const recurrenceLabels: Record<string, string> = {
  DAILY:    'tomorrow',
  WEEKLY:   'next week',
  BIWEEKLY: 'in 2 weeks',
  MONTHLY:  'next month',
  YEARLY:   'next year',
}

function getNextDate(currentDue: string, recurrence: string): Date {
  const base = new Date(currentDue)
  switch (recurrence) {
    case 'DAILY':    base.setDate(base.getDate() + 1);         break
    case 'WEEKLY':   base.setDate(base.getDate() + 7);         break
    case 'BIWEEKLY': base.setDate(base.getDate() + 14);        break
    case 'MONTHLY':  base.setMonth(base.getMonth() + 1);       break
    case 'YEARLY':   base.setFullYear(base.getFullYear() + 1); break
  }
  return base
}

export default function RecurringTaskModal({ task, isDark, onConfirm, onSkip, onDismiss, isLoading }: Props) {
  const colors = {
    card:      isDark ? '#0f172a' : '#ffffff',
    border:    isDark ? '#1e293b' : '#e2e8f0',
    text:      isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    subBg:     isDark ? '#1e293b' : '#f8fafc',
  }

  const nextLabel = recurrenceLabels[task.recurrence] || 'next occurrence'

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '16px',
    }}>
      <div style={{
        backgroundColor: colors.card, borderRadius: '20px',
        border: `1px solid ${colors.border}`,
        padding: '32px', width: '100%', maxWidth: '420px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RefreshCw size={20} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.text, margin: 0 }}>
                Recurring Task
              </h3>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>
                This task repeats {task.recurrence.toLowerCase()}
              </p>
            </div>
          </div>
          <button onClick={onDismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '4px',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Task info */}
        <div style={{
          padding: '14px 16px', borderRadius: '12px',
          backgroundColor: colors.subBg, border: `1px solid ${colors.border}`,
          marginBottom: '20px',
        }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: '0 0 4px' }}>
            {task.title}
          </p>
          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
            Next occurrence: <strong style={{ color: colors.text }}>{nextLabel}</strong>
            {task.dueDate && ` (${getNextDate(task.dueDate, task.recurrence).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })})`}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '11px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', color: '#fff', fontSize: '14px',
              fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Check size={16} />
            {isLoading ? 'Creating...' : `Yes, schedule for ${nextLabel}`}
          </button>

          <button
            onClick={onSkip}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '11px',
              backgroundColor: colors.subBg,
              border: `1px solid ${colors.border}`,
              color: colors.textMuted, fontSize: '14px',
              fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <SkipForward size={16} />
            Skip this occurrence
          </button>

          <button
            onClick={onDismiss}
            style={{
              padding: '10px', borderRadius: '11px', border: 'none',
              backgroundColor: 'transparent', color: colors.textMuted,
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Don't create next occurrence
          </button>
        </div>
      </div>
    </div>
  )
}
