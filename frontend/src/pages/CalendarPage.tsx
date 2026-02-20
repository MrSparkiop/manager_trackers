import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import api from '../lib/axios'
import { useThemeStore } from '../store/themeStore'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  allDay: boolean
  color: string
  taskId?: string
  task?: { id: string; title: string }
}

interface Task { id: string; title: string }

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const queryClient = useQueryClient()
  const { isDark } = useThemeStore()
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', color: '#6366f1',
    date: '', startTime: '09:00', endTime: '10:00',
    allDay: false, taskId: ''
  })

  const colors = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    input: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    cellBg: isDark ? '#0f172a' : '#ffffff',
    cellHover: isDark ? '#1e293b' : '#f8fafc',
    sidePanelBg: isDark ? '#0f172a' : '#ffffff',
    dayHeader: isDark ? '#475569' : '#94a3b8',
    otherMonth: isDark ? 0.3 : 0.4,
  }

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', year, month],
    queryFn: () => api.get('/calendar').then(r => r.data),
  })

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/calendar', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); closeModal() }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
  })

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday   = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const openCreate = (day?: Date) => {
    const d = day || today
    setForm({
      title: '', description: '', color: '#6366f1',
      date: d.toISOString().split('T')[0],
      startTime: '09:00', endTime: '10:00',
      allDay: false, taskId: ''
    })
    setShowModal(true)
  }

  const closeModal = () => setShowModal(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const startTime = form.allDay
      ? new Date(`${form.date}T00:00:00`).toISOString()
      : new Date(`${form.date}T${form.startTime}:00`).toISOString()
    const endTime = form.allDay
      ? new Date(`${form.date}T23:59:59`).toISOString()
      : new Date(`${form.date}T${form.endTime}:00`).toISOString()
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      color: form.color, startTime, endTime,
      allDay: form.allDay,
      taskId: form.taskId || undefined,
    })
  }

  // Build calendar grid
  const firstDay     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const daysInPrev   = new Date(year, month, 0).getDate()
  const cells: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false })
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ date: new Date(year, month, i), isCurrentMonth: true })
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++)
    cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })

  const getEventsForDay = (date: Date) =>
    events.filter(e => {
      const d = new Date(e.startTime)
      return d.getFullYear() === date.getFullYear() &&
             d.getMonth()    === date.getMonth() &&
             d.getDate()     === date.getDate()
    })

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth() &&
    date.getDate()     === today.getDate()

  const formatEventTime = (e: CalendarEvent) => {
    if (e.allDay) return 'All day'
    return new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  const inputStyle = {
    width: '100%', backgroundColor: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px',
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: colors.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: 0 }}>
            {MONTHS[month]} {year}
          </h1>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={prevMonth} style={{
              backgroundColor: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '6px 10px', color: colors.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday} style={{
              backgroundColor: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '6px 12px', color: colors.textMuted,
              cursor: 'pointer', fontSize: '13px', fontWeight: '500'
            }}>
              Today
            </button>
            <button onClick={nextMonth} style={{
              backgroundColor: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '6px 10px', color: colors.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <button onClick={() => openCreate()} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#6366f1', color: '#ffffff', border: 'none',
          borderRadius: '10px', padding: '10px 18px', fontSize: '14px',
          fontWeight: '600', cursor: 'pointer'
        }}>
          <Plus size={16} /> New Event
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Calendar Grid */}
        <div style={{ flex: 1 }}>
          {/* Day headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            marginBottom: '4px',
            backgroundColor: colors.card,
            borderRadius: '12px 12px 0 0',
            border: `1px solid ${colors.border}`,
            borderBottom: 'none'
          }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center', padding: '10px 0',
                fontSize: '12px', fontWeight: '600', color: colors.dayHeader
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
            border: `1px solid ${colors.border}`,
            borderRadius: '0 0 12px 12px',
            overflow: 'hidden',
            backgroundColor: colors.border,
            gap: '1px'
          }}>
            {cells.map(({ date, isCurrentMonth }, idx) => {
              const dayEvents    = getEventsForDay(date)
              const todayCell    = isToday(date)
              const isSelected   = selectedDay?.toDateString() === date.toDateString()

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(date)}
                  onDoubleClick={() => { setSelectedDay(date); openCreate(date) }}
                  style={{
                    minHeight: '90px', padding: '8px',
                    backgroundColor: isSelected
                      ? (isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)')
                      : colors.cellBg,
                    cursor: 'pointer',
                    opacity: isCurrentMonth ? 1 : colors.otherMonth,
                    transition: 'background-color 0.15s'
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: todayCell ? '700' : '500',
                    backgroundColor: todayCell ? '#6366f1' : 'transparent',
                    color: todayCell ? '#ffffff' : colors.text,
                    marginBottom: '4px',
                    border: isSelected && !todayCell ? `2px solid #6366f1` : '2px solid transparent'
                  }}>
                    {date.getDate()}
                  </div>

                  {/* Events */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} style={{
                        fontSize: '11px', fontWeight: '500',
                        backgroundColor: event.color + '30',
                        color: event.color,
                        borderLeft: `2px solid ${event.color}`,
                        borderRadius: '3px', padding: '1px 5px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '10px', color: colors.textMuted, paddingLeft: '4px' }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{
          width: '260px', flexShrink: 0,
          backgroundColor: colors.sidePanelBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px', padding: '20px',
          alignSelf: 'flex-start'
        }}>
          {selectedDay ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: 0 }}>
                  {selectedDay.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <button onClick={() => openCreate(selectedDay)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1',
                  display: 'flex', alignItems: 'center'
                }}>
                  <Plus size={16} />
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <p style={{ color: colors.textMuted, fontSize: '13px' }}>No events</p>
                  <button onClick={() => openCreate(selectedDay)} style={{
                    marginTop: '8px', backgroundColor: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px',
                    padding: '6px 12px', color: '#818cf8', fontSize: '12px',
                    cursor: 'pointer', fontWeight: '500'
                  }}>
                    + Add event
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDayEvents.map(event => (
                    <div key={event.id} style={{
                      padding: '10px 12px', borderRadius: '10px',
                      backgroundColor: event.color + '12',
                      border: `1px solid ${event.color}30`,
                      borderLeft: `3px solid ${event.color}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: 0 }}>
                            {event.title}
                          </p>
                          <p style={{ fontSize: '11px', color: event.color, margin: '3px 0 0' }}>
                            {formatEventTime(event)}
                          </p>
                          {event.description && (
                            <p style={{ fontSize: '11px', color: colors.textMuted, margin: '4px 0 0' }}>
                              {event.description}
                            </p>
                          )}
                          {event.task && (
                            <p style={{ fontSize: '11px', color: '#818cf8', margin: '4px 0 0' }}>
                              🔗 {event.task.title}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => { if (confirm('Delete event?')) deleteMutation.mutate(event.id) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '2px', flexShrink: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                width: '48px', height: '48px', backgroundColor: 'rgba(99,102,241,0.1)',
                borderRadius: '12px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 12px'
              }}>
                <ChevronLeft size={20} color="#818cf8" />
              </div>
              <p style={{ color: colors.textMuted, fontSize: '13px', fontWeight: '500' }}>Click a day</p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                Double-click to add event
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '16px'
        }}>
          <div style={{
            backgroundColor: colors.card, borderRadius: '20px',
            border: `1px solid ${colors.border}`, padding: '32px',
            width: '100%', maxWidth: '460px',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>New Event</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Event Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Team Meeting" required style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional details..." rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                      width: '26px', height: '26px', borderRadius: '50%', backgroundColor: c,
                      border: form.color === c ? '2px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px'
                    }} />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  required style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="allDay" checked={form.allDay}
                  onChange={e => setForm({ ...form, allDay: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6366f1' }} />
                <label htmlFor="allDay" style={{ fontSize: '14px', color: colors.textMuted, cursor: 'pointer' }}>
                  All day event
                </label>
              </div>

              {!form.allDay && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Start Time</label>
                    <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                      style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>End Time</label>
                    <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                      style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Link to Task (optional)</label>
                <select value={form.taskId} onChange={e => setForm({ ...form, taskId: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">No task</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                  color: colors.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}>Cancel</button>
                <button type="submit" style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: '#6366f1', border: 'none', color: '#ffffff',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                }}>Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}