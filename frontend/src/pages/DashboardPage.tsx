import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { CheckSquare, FolderKanban, Timer, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import { StatCardSkeleton } from '../components/Skeleton'

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
  URGENT: { bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
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
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()

  const colors = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    subBg: isDark ? '#1e293b' : '#f8fafc',
    tooltip: isDark ? '#1e293b' : '#ffffff',
  }

  const { data: todayTasks = [], isLoading: loadingToday } = useQuery<Task[]>({
    queryKey: ['tasks', 'today'],
    queryFn: () => api.get('/tasks/today').then(r => r.data),
  })

  const { data: overdueTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'overdue'],
    queryFn: () => api.get('/tasks/overdue').then(r => r.data),
  })

  const { data: projects = [], isLoading: loadingProjects } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const { data: allTasks = [], isLoading: loadingAll } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data),
  })

  const { data: timeSummary } = useQuery<TimeSummary>({
    queryKey: ['time-summary'],
    queryFn: () => api.get('/time-tracker/summary').then(r => r.data),
  })

  const isLoading = loadingToday || loadingProjects || loadingAll

  const statusCounts = [
    { name: 'To Do',       value: allTasks.filter(t => t.status === 'TODO').length,        color: '#64748b' },
    { name: 'In Progress', value: allTasks.filter(t => t.status === 'IN_PROGRESS').length, color: '#60a5fa' },
    { name: 'In Review',   value: allTasks.filter(t => t.status === 'IN_REVIEW').length,   color: '#a78bfa' },
    { name: 'Done',        value: allTasks.filter(t => t.status === 'DONE').length,        color: '#4ade80' },
  ].filter(s => s.value > 0)

  const priorityData = [
    { name: 'Low',    value: allTasks.filter(t => t.priority === 'LOW').length,    color: '#4ade80' },
    { name: 'Medium', value: allTasks.filter(t => t.priority === 'MEDIUM').length, color: '#facc15' },
    { name: 'High',   value: allTasks.filter(t => t.priority === 'HIGH').length,   color: '#fb923c' },
    { name: 'Urgent', value: allTasks.filter(t => t.priority === 'URGENT').length, color: '#f87171' },
  ]

  const projectChartData = projects.slice(0, 5).map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    total: p.tasks?.length || 0,
    done: p.tasks?.filter((t: any) => t.status === 'DONE').length || 0,
  }))

  const stats = [
    { label: "Today's Tasks", value: todayTasks.length,   icon: CheckSquare, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { label: 'Overdue',       value: overdueTasks.length, icon: AlertCircle, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    { label: 'Projects',      value: projects.length,     icon: FolderKanban, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Time Today',    value: timeSummary ? formatDuration(timeSummary.todaySeconds) : '0h 0m', icon: Clock, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  ]

  const card: React.CSSProperties = {
    backgroundColor: colors.card,
    borderRadius: '16px',
    border: `1px solid ${colors.border}`,
    padding: isMobile ? '16px' : '24px',
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: colors.tooltip, border: `1px solid ${colors.border}`,
          borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: colors.text
        }}>
          <p style={{ margin: 0, fontWeight: '600' }}>{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ margin: '4px 0 0', color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{
      padding: isMobile ? '16px' : '32px',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: colors.bg,
      minHeight: '100vh'
    }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: '700', color: colors.text, margin: 0 }}>
          {greeting}, {user?.firstName}! 👋
        </h1>
        <p style={{ color: colors.textMuted, marginTop: '6px', fontSize: '14px' }}>
          Here's your overview for today.
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {isLoading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={card}>
              <div style={{
                width: '38px', height: '38px', backgroundColor: bg,
                borderRadius: '10px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '12px'
              }}>
                <Icon size={18} color={color} />
              </div>
              <p style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: colors.text, margin: 0 }}>{value}</p>
              <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>{label}</p>
            </div>
          ))
        )}
      </div>

      {/* Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#6366f1" /> Tasks by Status
          </h2>
          {statusCounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textMuted, fontSize: '14px' }}>No tasks yet</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {statusCounts.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {statusCounts.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
                      <span style={{ fontSize: '13px', color: colors.textMuted }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#6366f1" /> Tasks by Priority
          </h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={priorityData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: colors.textMuted }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Progress */}
      {projectChartData.length > 0 && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban size={16} color="#6366f1" /> Project Progress
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={projectChartData} barSize={20} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: colors.textMuted }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total" fill={isDark ? '#1e293b' : '#e2e8f0'} radius={[6, 6, 0, 0]} />
              <Bar dataKey="done"  name="Done"  fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '16px'
      }}>
        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} color="#60a5fa" /> Today's Tasks
          </h2>
          {todayTasks.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No tasks due today 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todayTasks.map(task => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', backgroundColor: colors.subBg, borderRadius: '10px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </p>
                    {task.project && (
                      <p style={{ fontSize: '11px', color: task.project.color, margin: '2px 0 0' }}>{task.project.name}</p>
                    )}
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={16} color="#34d399" /> Time Summary
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Today',     value: timeSummary ? formatDuration(timeSummary.todaySeconds) : '0h 0m', color: '#34d399' },
              { label: 'This Week', value: timeSummary ? formatDuration(timeSummary.weekSeconds)  : '0h 0m', color: '#60a5fa' },
              { label: 'All Time',  value: timeSummary ? formatDuration(timeSummary.totalSeconds) : '0h 0m', color: '#a78bfa' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', backgroundColor: colors.subBg, borderRadius: '10px'
              }}>
                <span style={{ fontSize: '14px', color: colors.textMuted }}>{label}</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}