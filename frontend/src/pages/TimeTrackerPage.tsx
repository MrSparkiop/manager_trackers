import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Trash2, Clock, Plus, X } from 'lucide-react'
import api from '../lib/axios'
import { useThemeStore } from '../store/themeStore'
import { TimeEntrySkeleton } from '../components/Skeleton'

interface Task { id: string; title: string; project?: { name: string; color: string } }
interface TimeEntry {
  id: string
  description?: string
  startTime: string
  endTime?: string
  duration?: number
  taskId?: string
  task?: { id: string; title: string }
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDurationShort(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TimeTrackerPage() {
  const queryClient = useQueryClient()
  const { isDark } = useThemeStore()
  const [elapsed, setElapsed] = useState(0)
  const [description, setDescription] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({
    description: '', taskId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '', endTime: ''
  })

  const colors = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    input: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    subBg: isDark ? '#1e293b' : '#f8fafc',
    timerBg: isDark
      ? 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #ede9fe 100%)',
  }

  const { data: running, refetch: refetchRunning } = useQuery<TimeEntry | null>({
    queryKey: ['time-running'],
    queryFn: () => api.get('/time-tracker/running').then(r => r.data),
    refetchInterval: 5000,
  })

  const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ['time-entries'],
    queryFn: () => api.get('/time-tracker').then(r => r.data),
  })

  const { data: summary } = useQuery<{ todaySeconds: number; weekSeconds: number; totalSeconds: number }>({
    queryKey: ['time-summary'],
    queryFn: () => api.get('/time-tracker/summary').then(r => r.data),
  })

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  })

  useEffect(() => {
    if (!running) { setElapsed(0); return }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(running.startTime).getTime()) / 1000)
      setElapsed(diff)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [running])

  const startMutation = useMutation({
    mutationFn: () => api.post('/time-tracker/start', {
      startTime: new Date().toISOString(),
      description: description || undefined,
      taskId: selectedTaskId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-running'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['time-summary'] })
      refetchRunning()
    }
  })

  const stopMutation = useMutation({
    mutationFn: () => api.post(`/time-tracker/stop/${running?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-running'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['time-summary'] })
      setDescription(''); setSelectedTaskId('')
      refetchRunning()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/time-tracker/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['time-summary'] })
    }
  })

  const manualMutation = useMutation({
    mutationFn: () => {
      const start = new Date(`${manual.date}T${manual.startTime}:00`)
      const end   = new Date(`${manual.date}T${manual.endTime}:00`)
      return api.post('/time-tracker/manual', {
        description: manual.description || undefined,
        taskId: manual.taskId || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['time-summary'] })
      setShowManual(false)
      setManual({ description: '', taskId: '', date: new Date().toISOString().split('T')[0], startTime: '', endTime: '' })
    }
  })

  const grouped: Record<string, TimeEntry[]> = {}
  entries.filter(e => e.endTime).forEach(e => {
    const key = formatDate(e.startTime)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  })

  const inputStyle = {
    width: '100%', backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px', color: colors.text,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: colors.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: 0 }}>Time Tracker</h1>
          <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>Track time spent on your tasks</p>
        </div>
        <button onClick={() => setShowManual(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: colors.card, color: colors.textMuted,
          border: `1px solid ${colors.border}`, borderRadius: '10px',
          padding: '10px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer'
        }}>
          <Plus size={15} /> Add Manual
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Today',     value: summary ? formatDurationShort(summary.todaySeconds) : '0m' },
          { label: 'This Week', value: summary ? formatDurationShort(summary.weekSeconds)  : '0m' },
          { label: 'All Time',  value: summary ? formatDurationShort(summary.totalSeconds) : '0m' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: colors.card, border: `1px solid ${colors.border}`,
            borderRadius: '16px', padding: '20px', textAlign: 'center'
          }}>
            <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, margin: 0 }}>{value}</p>
            <p style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div style={{
        border: running ? '1px solid rgba(99,102,241,0.4)' : `1px solid ${colors.border}`,
        borderRadius: '20px', padding: '32px', marginBottom: '28px',
        background: running ? colors.timerBg : colors.card
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '64px', fontWeight: '700',
            color: running ? '#818cf8' : colors.border,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '4px', transition: 'color 0.3s'
          }}>
            {formatDuration(elapsed)}
          </div>
          {running && (
            <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '8px' }}>
              Started at {formatTime(running.startTime)}
              {running.task && <span style={{ color: '#818cf8' }}> · {running.task.title}</span>}
            </p>
          )}
        </div>

        {!running ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What are you working on?"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && startMutation.mutate()} />
            <select value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}
              style={{ ...inputStyle, width: '200px', cursor: 'pointer' }}>
              <option value="">No task</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: '#6366f1', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Play size={20} color="#ffffff" fill="#ffffff" />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ flex: 1, backgroundColor: colors.input, borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ color: colors.text, fontSize: '14px', margin: 0 }}>
                {running.description || 'No description'}
              </p>
            </div>
            <button onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending} style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: '#ef4444', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Square size={18} color="#ffffff" fill="#ffffff" />
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 16px' }}>History</h2>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[...Array(4)].map((_, i) => <TimeEntrySkeleton key={i} />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Clock size={40} color={colors.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ color: colors.textMuted, fontSize: '15px' }}>No time entries yet</p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>Start the timer to track your time</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(grouped).map(([date, dateEntries]) => {
              const totalSecs = dateEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
              return (
                <div key={date}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '8px', paddingBottom: '8px', borderBottom: `1px solid ${colors.border}`
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textMuted }}>{date}</span>
                    <span style={{ fontSize: '13px', color: colors.textMuted }}>{formatDurationShort(totalSecs)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dateEntries.map(entry => (
                      <div key={entry.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        backgroundColor: colors.card, border: `1px solid ${colors.border}`,
                        borderRadius: '12px', padding: '12px 16px'
                      }}>
                        <div style={{
                          width: '36px', height: '36px', backgroundColor: 'rgba(99,102,241,0.1)',
                          borderRadius: '10px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0
                        }}>
                          <Clock size={16} color="#818cf8" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text, margin: 0 }}>
                            {entry.description || (entry.task ? entry.task.title : 'No description')}
                          </p>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: '3px 0 0' }}>
                            {formatTime(entry.startTime)} — {entry.endTime ? formatTime(entry.endTime) : '...'}
                            {entry.task && <span style={{ color: '#818cf8', marginLeft: '8px' }}>· {entry.task.title}</span>}
                          </p>
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: 0, flexShrink: 0 }}>
                          {entry.duration ? formatDurationShort(entry.duration) : '—'}
                        </p>
                        <button onClick={() => { if (confirm('Delete this entry?')) deleteMutation.mutate(entry.id) }} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: colors.textMuted, padding: '4px', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', flexShrink: 0
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Manual Modal */}
      {showManual && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '16px'
        }}>
          <div style={{
            backgroundColor: colors.card, borderRadius: '20px',
            border: `1px solid ${colors.border}`, padding: '32px',
            width: '100%', maxWidth: '460px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>Add Manual Entry</h2>
              <button onClick={() => setShowManual(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Description</label>
                <input value={manual.description} onChange={e => setManual({ ...manual, description: e.target.value })}
                  placeholder="What did you work on?" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Task (optional)</label>
                <select value={manual.taskId} onChange={e => setManual({ ...manual, taskId: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">No task</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Date</label>
                <input type="date" value={manual.date} onChange={e => setManual({ ...manual, date: e.target.value })}
                  style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Start Time</label>
                  <input type="time" value={manual.startTime} onChange={e => setManual({ ...manual, startTime: e.target.value })}
                    style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>End Time</label>
                  <input type="time" value={manual.endTime} onChange={e => setManual({ ...manual, endTime: e.target.value })}
                    style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setShowManual(false)} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                  color: colors.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}>Cancel</button>
                <button onClick={() => manualMutation.mutate()} disabled={!manual.startTime || !manual.endTime} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: '#6366f1', border: 'none', color: '#ffffff',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                  opacity: (!manual.startTime || !manual.endTime) ? 0.5 : 1
                }}>Save Entry</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}