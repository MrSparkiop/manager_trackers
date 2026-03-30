import { useState, useEffect, useRef } from 'react'
import { useThemeStore } from '../../store/themeStore'
import { useIsMobile } from '../../lib/useIsMobile'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Activity, Database, Cpu, MemoryStick, Wifi, Clock, RefreshCw, Users } from 'lucide-react'
import api from '../../lib/axios'

const MAX_HISTORY = 30
const POLL_MS = 5000

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function StatusPill({ status }: { status: string }) {
  const color = status === 'ok' ? '#4ade80' : status === 'not_configured' ? '#f59e0b' : '#f87171'
  const label = status === 'ok' ? 'Healthy' : status === 'not_configured' ? 'Not configured' : 'Error'
  return (
    <span style={{
      fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: '700',
      backgroundColor: `${color}20`, color,
    }}>{label}</span>
  )
}

export default function AdminSystemHealthPage() {
  const { isDark } = useThemeStore()
  const isMobile = useIsMobile()
  const [health, setHealth] = useState<any>(null)
  const [error, setError] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const c = {
    bg:     isDark ? '#030712' : '#f1f5f9',
    card:   isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text:   isDark ? '#ffffff' : '#0f172a',
    muted:  isDark ? '#64748b' : '#94a3b8',
    sub:    isDark ? '#0d1117' : '#f8fafc',
    grid:   isDark ? '#1e293b' : '#e2e8f0',
  }

  async function fetchHealth() {
    try {
      const res = await api.get('/admin/system-health')
      const data = res.data
      setHealth(data)
      setError(false)
      setLastUpdated(new Date())
      setHistory(prev => {
        const point = {
          t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          heap: data.memory.heapUsedMb,
          rss: data.memory.rssMb,
          cpu: data.cpu.loadPct,
          sockets: data.sockets.socketConnections,
        }
        return [...prev.slice(-MAX_HISTORY + 1), point]
      })
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    fetchHealth()
    intervalRef.current = setInterval(fetchHealth, POLL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const statCards = health ? [
    { label: 'Uptime', value: formatUptime(health.uptime), icon: Clock, color: '#60a5fa' },
    { label: 'Online Users', value: health.sockets.onlineUsers, icon: Users, color: '#4ade80' },
    { label: 'WS Connections', value: health.sockets.socketConnections, icon: Wifi, color: '#a78bfa' },
    { label: 'DB Latency', value: `${health.db.latencyMs}ms`, icon: Database, color: health.db.latencyMs > 100 ? '#fb923c' : '#4ade80' },
    { label: 'Heap Used', value: `${health.memory.heapUsedMb} MB`, icon: MemoryStick, color: '#f59e0b' },
    { label: 'CPU Load', value: `${health.cpu.loadPct}%`, icon: Cpu, color: health.cpu.loadPct > 80 ? '#f87171' : health.cpu.loadPct > 50 ? '#fb923c' : '#4ade80' },
  ] : []

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Activity size={22} color="#60a5fa" />
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: c.text }}>System Health</h1>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: c.muted }}>
            Live metrics — refreshes every {POLL_MS / 1000}s
            {lastUpdated && <span> · Last updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${c.border}`, backgroundColor: c.card, color: c.muted, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px', marginBottom: '20px' }}>
          Failed to fetch health metrics. Make sure the backend is running.
        </div>
      )}

      {/* Service status row */}
      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Database', status: health.db.status, detail: `${health.db.latencyMs}ms`, icon: Database },
            { label: 'Redis', status: health.redis.status, detail: health.redis.status === 'ok' ? `${health.redis.latencyMs}ms` : '—', icon: Wifi },
            { label: 'API', status: 'ok', detail: `${health.cpu.cores} CPU cores`, icon: Activity },
          ].map(({ label, status, detail, icon: Icon }) => (
            <div key={label} style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: c.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={c.muted} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: c.text }}>{label}</span>
                  <StatusPill status={status} />
                </div>
                <span style={{ fontSize: '12px', color: c.muted }}>{detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icon size={14} color={color} />
                <p style={{ margin: 0, fontSize: '11px', color: c.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              </div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Memory gauge */}
      {health && (
        <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '600', color: c.text }}>Memory Usage</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Heap', used: health.memory.heapUsedMb, total: health.memory.heapTotalMb, color: '#a78bfa' },
              { label: 'System RAM', used: health.memory.systemTotalMb - health.memory.systemFreeMb, total: health.memory.systemTotalMb, color: '#60a5fa' },
            ].map(({ label, used, total, color }) => {
              const pct = Math.round((used / total) * 100)
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: c.muted }}>{label}</span>
                    <span style={{ fontSize: '12px', color: c.text, fontWeight: '600' }}>{used} / {total} MB ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '999px', backgroundColor: c.sub, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct > 85 ? '#f87171' : pct > 65 ? '#fb923c' : color, borderRadius: '999px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      {history.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          {/* Memory chart */}
          <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: c.text }}>Heap Memory (MB)</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: c.muted }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: c.muted }} width={36} />
                <Tooltip contentStyle={{ backgroundColor: c.card, border: `1px solid ${c.border}`, borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="heap" stroke="#a78bfa" strokeWidth={2} dot={false} name="Heap MB" />
                <Line type="monotone" dataKey="rss" stroke="#60a5fa" strokeWidth={2} dot={false} name="RSS MB" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* CPU + Connections chart */}
          <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: c.text }}>CPU Load % & WS Connections</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: c.muted }} interval="preserveStartEnd" />
                <YAxis yAxisId="cpu" tick={{ fontSize: 10, fill: c.muted }} width={36} domain={[0, 100]} />
                <YAxis yAxisId="ws" orientation="right" tick={{ fontSize: 10, fill: c.muted }} width={36} />
                <Tooltip contentStyle={{ backgroundColor: c.card, border: `1px solid ${c.border}`, borderRadius: '8px', fontSize: '12px' }} />
                <Line yAxisId="cpu" type="monotone" dataKey="cpu" stroke="#fb923c" strokeWidth={2} dot={false} name="CPU %" />
                <Line yAxisId="ws" type="monotone" dataKey="sockets" stroke="#4ade80" strokeWidth={2} dot={false} name="WS Conns" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {health && history.length <= 1 && (
        <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '32px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>
          Collecting data… charts will appear after a few seconds.
        </div>
      )}

      {!health && !error && (
        <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '48px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>
          Loading system metrics…
        </div>
      )}
    </div>
  )
}
