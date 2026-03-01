import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Wrench, X } from 'lucide-react'
import api from '../lib/axios'

// Accept a plain timestamp (ms) so the dependency is a stable primitive,
// not a Date object whose reference changes on every render.
function useCountdown(targetMs: number | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number; hours: number; minutes: number; seconds: number; total: number
  } | null>(null)

  useEffect(() => {
    if (targetMs === null) { setTimeLeft(null); return }

    const calc = () => {
      const diff = targetMs - Date.now()
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }); return }
      setTimeLeft({
        total:   diff,
        days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    calc()
    const timer = setInterval(calc, 1000)
    return () => clearInterval(timer)
  }, [targetMs])  // number compared by value — stable across renders

  return timeLeft
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '36px' }}>
      <div style={{
        fontSize: '18px', fontWeight: '800', lineHeight: 1,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em'
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: '9px', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  )
}

function Divider() {
  return <span style={{ fontSize: '18px', fontWeight: '800', opacity: 0.5, marginBottom: '10px' }}>:</span>
}

export default function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false)

  const { data: maintenance } = useQuery({
    queryKey: ['maintenance-upcoming'],
    queryFn: () => api.get('/admin/maintenance/upcoming').then(r => r.data).catch(() => null),
    refetchInterval: 60000,
  })

  const now = Date.now()
  // Keep Date objects only for formatting — convert to ms for the hook dependency
  const startTime = maintenance?.startTime ? new Date(maintenance.startTime) : null
  const endTime   = maintenance?.endTime   ? new Date(maintenance.endTime)   : null
  const startMs   = startTime?.getTime() ?? null
  const endMs     = endTime?.getTime()   ?? null

  const isActive   = startMs !== null && endMs !== null && now >= startMs && now < endMs
  const isUpcoming = startMs !== null && now < startMs

  // Pass stable number timestamps — not Date objects — to avoid infinite re-render loop
  const countdownTargetMs = isActive ? endMs : isUpcoming ? startMs : null
  const countdown = useCountdown(maintenance?.isActive ? countdownTargetMs : null)

  useEffect(() => {
    if (countdown?.total === 0) setDismissed(true)
  }, [countdown?.total])

  if (!maintenance || !maintenance.isActive || dismissed) return null
  if (!isActive && !isUpcoming) return null

  const colors = isActive
    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#fca5a5', accent: '#ef4444', icon: '#f87171' }
    : { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#fcd34d', accent: '#f59e0b', icon: '#fbbf24' }

  const Icon = isActive ? Wrench : AlertTriangle

  const formatTime = (d: Date) => d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div style={{
      backgroundColor: colors.bg,
      borderBottom: `1px solid ${colors.border}`,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      flexWrap: 'wrap', justifyContent: 'center',
      position: 'relative',
    }}>

      {/* Icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <Icon size={15} color={colors.icon} />
        <span style={{
          fontSize: '12px', fontWeight: '700', color: colors.accent,
          textTransform: 'uppercase', letterSpacing: '0.08em'
        }}>
          {isActive ? 'Maintenance In Progress' : 'Scheduled Maintenance'}
        </span>
      </div>

      {/* Message */}
      <span style={{ fontSize: '13px', color: colors.text, flexShrink: 1 }}>
        {maintenance.title} — {maintenance.message}
      </span>

      {/* Time info */}
      <span style={{ fontSize: '11px', color: colors.text, opacity: 0.7, flexShrink: 0 }}>
        {isActive
          ? `Ends ${formatTime(endTime!)}`
          : `${formatTime(startTime!)} → ${formatTime(endTime!)}`
        }
      </span>

      {/* Countdown */}
      {countdown && countdown.total > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '4px',
          color: colors.text, flexShrink: 0,
          backgroundColor: isActive ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
          padding: '6px 12px', borderRadius: '10px',
          border: `1px solid ${colors.border}`,
        }}>
          <Clock size={12} style={{ marginBottom: '10px', flexShrink: 0 }} />
          {countdown.days > 0 && (
            <><TimeUnit value={countdown.days} label="days" /><Divider /></>
          )}
          <TimeUnit value={countdown.hours} label="hrs" />
          <Divider />
          <TimeUnit value={countdown.minutes} label="min" />
          <Divider />
          <TimeUnit value={countdown.seconds} label="sec" />
        </div>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: colors.text, opacity: 0.6, padding: '4px',
          display: 'flex', alignItems: 'center',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
      >
        <X size={14} />
      </button>
    </div>
  )
}
