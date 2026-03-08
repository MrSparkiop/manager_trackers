import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, Clock, CheckSquare, AlertCircle, Zap,
  FolderKanban, Target, Activity, BarChart2,
} from 'lucide-react'
import api from '../lib/axios'

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function fmt(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

/* ─── types ───────────────────────────────────────────────────────────────── */
interface Insights {
  summary: {
    totalTasks: number
    completedTasks: number
    overdueTasks: number
    inProgressTasks: number
    todoTasks: number
    completedThisWeek: number
    completionRate: number
    totalTimeSeconds: number
    weekTimeSeconds: number
    monthTimeSeconds: number
    avgDailyFocusSeconds: number
    totalProjects: number
  }
  timePerProject: { name: string; color: string; seconds: number }[]
  productiveByDay: { day: string; seconds: number }[]
  focusThisWeek: { day: string; date: string; seconds: number }[]
  completedByDay: { date: string; completed: number; created: number }[]
  projectWorkload: { name: string; color: string; todo: number; inProgress: number; done: number; total: number }[]
  topTasksByTime: { title: string; seconds: number; projectName?: string; projectColor?: string }[]
  velocity: { week: string; completed: number }[]
  priorityDist: { name: string; value: number; color: string }[]
}

/* ─── custom tooltip ──────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, isDark, timeFormat }: any) {
  if (!active || !payload?.length) return null
  const bg = isDark ? '#1e293b' : '#ffffff'
  const border = isDark ? '#334155' : '#e2e8f0'
  const text = isDark ? '#f1f5f9' : '#0f172a'
  const muted = isDark ? '#94a3b8' : '#64748b'
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: text, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ margin: '3px 0', color: p.color ?? p.fill ?? text }}>
          {p.name}: <strong>{timeFormat ? fmt(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

/* ─── section title ───────────────────────────────────────────────────────── */
function SectionTitle({ icon: Icon, title, color, textColor }: { icon: any; title: string; color: string; textColor: string }) {
  return (
    <h2 style={{ fontSize: 14, fontWeight: 700, color: textColor, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={15} color={color} /> {title}
    </h2>
  )
}

/* ─── skeleton ────────────────────────────────────────────────────────────── */
function Skel({ w = '100%', h = 20, isDark }: { w?: string | number; h?: number; isDark: boolean }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 8,
      background: isDark ? '#1e293b' : '#e2e8f0',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

/* ─── main page ───────────────────────────────────────────────────────────── */
export default function InsightsPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()

  const c = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    muted: isDark ? '#64748b' : '#94a3b8',
    sub: isDark ? '#1e293b' : '#f8fafc',
  }

  const { data, isLoading } = useQuery<Insights>({
    queryKey: ['analytics-insights'],
    queryFn: () => api.get('/analytics/insights').then(r => r.data),
    staleTime: 60_000,
  })

  const pad = isMobile ? '16px' : '32px'
  const cardStyle: React.CSSProperties = { backgroundColor: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: isMobile ? 16 : 24 }

  if (isLoading || !data) {
    return (
      <div style={{ padding: pad, background: c.bg, minHeight: '100vh' }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
        <div style={{ marginBottom: 24 }}>
          <Skel h={30} w={200} isDark={isDark} />
          <div style={{ marginTop: 8 }}><Skel h={16} w={300} isDark={isDark} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={110} isDark={isDark} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={280} isDark={isDark} />)}
        </div>
      </div>
    )
  }

  const s = data.summary

  const statCards = [
    { label: 'Completion Rate',      value: `${s.completionRate}%`,          sub: `${s.completedTasks} of ${s.totalTasks} tasks`,    icon: Target,     color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Focus This Week',       value: fmt(s.weekTimeSeconds),           sub: `Avg ${fmt(s.avgDailyFocusSeconds)}/day`,           icon: Clock,      color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    { label: 'Completed This Week',   value: s.completedThisWeek,              sub: `${s.totalTasks - s.completedTasks} still open`,   icon: CheckSquare,color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    { label: 'Overdue',               value: s.overdueTasks,                   sub: s.overdueTasks === 0 ? 'All caught up 🎉' : 'Need attention', icon: AlertCircle, color: s.overdueTasks > 0 ? '#f87171' : '#4ade80', bg: s.overdueTasks > 0 ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.12)' },
    { label: 'Total Time Tracked',    value: fmt(s.totalTimeSeconds),          sub: `This month: ${fmt(s.monthTimeSeconds)}`,          icon: Activity,   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    { label: 'Active Projects',       value: s.totalProjects,                  sub: `${s.inProgressTasks} tasks in progress`,          icon: FolderKanban,color:'#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'In Progress',           value: s.inProgressTasks,                sub: `${s.todoTasks} todo`,                             icon: Zap,        color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    { label: 'Total Tasks',           value: s.totalTasks,                     sub: `${s.completedTasks} completed`,                   icon: BarChart2,  color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  ]

  const maxFocus = Math.max(...data.focusThisWeek.map(d => d.seconds), 1)

  return (
    <div style={{ padding: pad, fontFamily: 'Inter, sans-serif', background: c.bg, minHeight: '100vh' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: c.text, margin: 0 }}>Insights</h1>
        <p style={{ color: c.muted, marginTop: 6, fontSize: 14 }}>
          Your productivity analytics — time, tasks, projects, and velocity.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} style={cardStyle}>
            <div style={{ width: 36, height: 36, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={17} color={color} />
            </div>
            <p style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: c.text, margin: 0 }}>{value}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: c.muted, margin: '3px 0 0' }}>{label}</p>
            <p style={{ fontSize: 11, color: c.muted, margin: '2px 0 0', opacity: 0.7 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Focus week + Time per project ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>

        <div style={cardStyle}>
          <SectionTitle icon={Clock} title="Focus Time This Week" color="#34d399" textColor={c.text} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.focusThisWeek.map(({ day, date, seconds }) => {
              const barPct = pct(seconds, maxFocus)
              const isToday = day === ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]
              return (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? '#34d399' : c.muted, width: 30, flexShrink: 0 }}>{day}</span>
                  <div style={{ flex: 1, height: 8, background: c.sub, borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: isToday ? '#34d399' : '#6366f1', borderRadius: 999 }} />
                  </div>
                  <span style={{ fontSize: 12, color: isToday ? '#34d399' : c.muted, width: 48, textAlign: 'right', fontWeight: isToday ? 700 : 400 }}>
                    {seconds > 0 ? fmt(seconds) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: c.muted }}>Week total</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>{fmt(s.weekTimeSeconds)}</span>
          </div>
        </div>

        <div style={cardStyle}>
          <SectionTitle icon={FolderKanban} title="Time Per Project" color="#a78bfa" textColor={c.text} />
          {data.timePerProject.length === 0 ? (
            <p style={{ color: c.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>No tracked time yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.timePerProject.slice(0, 6)} barSize={22} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: c.muted }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip isDark={isDark} timeFormat />} />
                  <Bar dataKey="seconds" name="Time" radius={[0, 6, 6, 0]}>
                    {data.timePerProject.slice(0, 6).map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {data.timePerProject.slice(0, 5).map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                      <span style={{ fontSize: 12, color: c.muted }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{fmt(p.seconds)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: Area chart + Priority pie ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16, marginBottom: 16 }}>

        <div style={cardStyle}>
          <SectionTitle icon={TrendingUp} title="Tasks Completed vs Created (Last 30 Days)" color="#60a5fa" textColor={c.text} />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.completedByDay}>
              <defs>
                <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradN" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: c.muted }} axisLine={false} tickLine={false}
                interval={Math.floor(data.completedByDay.length / 6)} />
              <YAxis hide allowDecimals={false} />
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Area type="monotone" dataKey="created"   name="Created"   stroke="#6366f1" fill="url(#gradN)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#60a5fa" fill="url(#gradC)" strokeWidth={2}   dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <SectionTitle icon={AlertCircle} title="Priority Distribution" color="#fb923c" textColor={c.text} />
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={data.priorityDist.filter(p => p.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                {data.priorityDist.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {data.priorityDist.map(p => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                  <span style={{ fontSize: 12, color: c.muted }}>{p.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Velocity + Productive days ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>

        <div style={cardStyle}>
          <SectionTitle icon={Zap} title="Completion Velocity (Last 8 Weeks)" color="#facc15" textColor={c.text} />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.velocity}>
              <CartesianGrid stroke={c.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: c.muted }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip content={<ChartTooltip isDark={isDark} />} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#facc15" strokeWidth={2.5}
                dot={{ r: 4, fill: '#facc15', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <SectionTitle icon={Activity} title="Most Productive Days (Last 30 Days)" color="#f472b6" textColor={c.text} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.productiveByDay} barSize={30}>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: c.muted }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip isDark={isDark} timeFormat />} />
              <Bar dataKey="seconds" name="Focus time" radius={[6, 6, 0, 0]}>
                {data.productiveByDay.map((d, i) => {
                  const max = Math.max(...data.productiveByDay.map(x => x.seconds))
                  const isMax = d.seconds === max && max > 0
                  return <Cell key={i} fill={isMax ? '#f472b6' : isDark ? '#334155' : '#e2e8f0'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 4: Project workload + Top tasks ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 8 }}>

        <div style={cardStyle}>
          <SectionTitle icon={FolderKanban} title="Project Workload" color="#6366f1" textColor={c.text} />
          {data.projectWorkload.length === 0 ? (
            <p style={{ color: c.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>No projects with tasks yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.projectWorkload.slice(0, 6).map(p => (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: c.muted }}>{p.done}/{p.total}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: c.sub, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ height: '100%', width: `${pct(p.done, p.total)}%`, background: '#4ade80' }} />
                    <div style={{ height: '100%', width: `${pct(p.inProgress, p.total)}%`, background: '#60a5fa' }} />
                    <div style={{ height: '100%', width: `${pct(p.todo, p.total)}%`, background: c.border }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    {[{ l: 'Done', v: p.done, color: '#4ade80' }, { l: 'In Progress', v: p.inProgress, color: '#60a5fa' }, { l: 'Todo', v: p.todo, color: c.muted }].map(x => (
                      <span key={x.l} style={{ fontSize: 10, color: x.color }}>● {x.l}: {x.v}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <SectionTitle icon={Clock} title="Top Tasks by Time Logged" color="#38bdf8" textColor={c.text} />
          {data.topTasksByTime.length === 0 ? (
            <p style={{ color: c.muted, fontSize: 13, textAlign: 'center', padding: '48px 0' }}>No time logged on tasks yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.topTasksByTime.map((t, i) => {
                const maxSecs = data.topTasksByTime[0].seconds
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                        {t.projectName && (
                          <p style={{ fontSize: 10, color: t.projectColor ?? c.muted, margin: '1px 0 0' }}>● {t.projectName}</p>
                        )}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', flexShrink: 0, marginLeft: 12 }}>{fmt(t.seconds)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: c.sub, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct(t.seconds, maxSecs)}%`, background: '#38bdf8', borderRadius: 999 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
