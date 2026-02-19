import { useQuery } from '@tanstack/react-query'
import { CheckSquare, FolderKanban, Timer, AlertCircle, Clock } from 'lucide-react'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string
  project?: { id: string; name: string; color: string }
}

interface TimeSummary {
  todaySeconds: number
  weekSeconds: number
  totalSeconds: number
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

const priorityColors: Record<string, { bg: string; color: string }> = {
  URGENT: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  HIGH:   { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  MEDIUM: { bg: 'rgba(234,179,8,0.15)',  color: '#facc15' },
  LOW:    { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80' },
}

function PriorityBadge({ priority }: { priority: string }) {
  const c = priorityColors[priority] || priorityColors.MEDIUM
  return (
    <span style={{
      fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
      backgroundColor: c.bg, color: c.color, fontWeight: '600'
    }}>
      {priority}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: todayTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'today'],
    queryFn: () => api.get('/tasks/today').then(r => r.data),
  })

  const { data: overdueTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'overdue'],
    queryFn: () => api.get('/tasks/overdue').then(r => r.data),
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const { data: timeSummary } = useQuery<TimeSummary>({
    queryKey: ['time-summary'],
    queryFn: () => api.get('/time-tracker/summary').then(r => r.data),
  })

  const stats = [
    { label: "Today's Tasks", value: todayTasks.length, icon: CheckSquare, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { label: 'Overdue',       value: overdueTasks.length, icon: AlertCircle, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    { label: 'Projects',      value: projects.length, icon: FolderKanban,  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Time Today',    value: timeSummary ? formatDuration(timeSummary.todaySeconds) : '0h 0m', icon: Clock, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  ]

  const card = {
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    border: '1px solid #1e293b',
    padding: '24px',
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
          Good morning, {user?.firstName}! 👋
        </h1>
        <p style={{ color: '#64748b', marginTop: '6px', fontSize: '15px' }}>
          Here's what's happening today.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={card}>
            <div style={{
              width: '42px', height: '42px', backgroundColor: bg,
              borderRadius: '12px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '16px'
            }}>
              <Icon size={20} color={color} />
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{value}</p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Today Tasks */}
        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} color="#60a5fa" /> Today's Tasks
          </h2>
          {todayTasks.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No tasks due today 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todayTasks.map(task => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', backgroundColor: '#1e293b', borderRadius: '10px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </p>
                    {task.project && (
                      <p style={{ fontSize: '11px', color: task.project.color, margin: '2px 0 0' }}>
                        {task.project.name}
                      </p>
                    )}
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue */}
        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#f87171" /> Overdue Tasks
          </h2>
          {overdueTasks.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No overdue tasks! 🚀</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {overdueTasks.map(task => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '10px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </p>
                    {task.project && (
                      <p style={{ fontSize: '11px', color: task.project.color, margin: '2px 0 0' }}>
                        {task.project.name}
                      </p>
                    )}
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time Summary */}
        <div style={{ ...card, gridColumn: 'span 2' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={16} color="#34d399" /> Time Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Today',     value: timeSummary ? formatDuration(timeSummary.todaySeconds) : '0h 0m' },
              { label: 'This Week', value: timeSummary ? formatDuration(timeSummary.weekSeconds)  : '0h 0m' },
              { label: 'All Time',  value: timeSummary ? formatDuration(timeSummary.totalSeconds) : '0h 0m' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                backgroundColor: '#1e293b', borderRadius: '12px',
                padding: '20px', textAlign: 'center'
              }}>
                <p style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{value}</p>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}