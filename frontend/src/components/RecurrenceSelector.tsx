import { RefreshCw } from 'lucide-react'

const OPTIONS = [
  { value: 'NONE',     label: 'No repeat' },
  { value: 'DAILY',    label: 'Daily' },
  { value: 'WEEKLY',   label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY',  label: 'Monthly' },
  { value: 'YEARLY',   label: 'Yearly' },
]

interface Props {
  value: string
  onChange: (v: string) => void
  endDate?: string
  onEndDateChange?: (v: string) => void
  isDark: boolean
}

export default function RecurrenceSelector({ value, onChange, endDate, onEndDateChange, isDark }: Props) {
  const inputStyle = {
    width: '100%', backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '10px', padding: '10px 14px',
    color: isDark ? '#ffffff' : '#0f172a',
    fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: isDark ? '#64748b' : '#94a3b8', marginBottom: '6px',
        }}>
          <RefreshCw size={12} /> Repeat
        </label>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {value !== 'NONE' && onEndDateChange && (
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: isDark ? '#64748b' : '#94a3b8', marginBottom: '6px' }}>
            End repeat (optional)
          </label>
          <input
            type="date"
            value={endDate || ''}
            onChange={e => onEndDateChange(e.target.value)}
            style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
          />
        </div>
      )}

      {value !== 'NONE' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 12px', borderRadius: '10px',
          backgroundColor: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <RefreshCw size={13} color="#818cf8" />
          <p style={{ fontSize: '12px', color: '#818cf8', margin: 0 }}>
            This task will repeat <strong>{OPTIONS.find(o => o.value === value)?.label.toLowerCase()}</strong>.
            When completed, you'll be asked to schedule the next occurrence.
          </p>
        </div>
      )}
    </div>
  )
}

export function RecurrenceBadge({ recurrence, isDark: _isDark }: { recurrence: string; isDark: boolean }) {
  if (!recurrence || recurrence === 'NONE') return null

  const labels: Record<string, string> = {
    DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: '2 Weeks',
    MONTHLY: 'Monthly', YEARLY: 'Yearly',
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '10px', padding: '1px 6px', borderRadius: '999px',
      backgroundColor: 'rgba(99,102,241,0.15)',
      color: '#818cf8', fontWeight: '600', flexShrink: 0,
    }}>
      🔁 {labels[recurrence]}
    </span>
  )
}
