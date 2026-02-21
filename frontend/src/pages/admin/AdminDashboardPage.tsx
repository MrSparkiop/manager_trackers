import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Users, CheckSquare, FolderKanban, Clock, TrendingUp, UserCheck, Activity } from 'lucide-react'
import api from '../../lib/axios'

export default function AdminDashboardPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()

  const colors = {
    card:      isDark ? '#0f172a' : '#ffffff',
    border:    isDark ? '#1e293b' : '#e2e8f0',
    text:      isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    subBg:     isDark ? '#1e293b' : '#f8fafc',
    tooltip:   isDark ? '#1e293b' : '#ffffff',
  }

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })

  const { data: activeUsers = [] } = useQuery({
    queryKey: ['admin-active-users'],
    queryFn: () => api.get('/admin/users/most-active').then(r => r.data),
  })

  const statCards = stats ? [
    { label: 'Total Users',      value: stats.totalUsers,      icon: Users,         color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
    { label: 'Total Tasks',      value: stats.totalTasks,      icon: CheckSquare,   color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
    { label: 'Total Projects',   value: stats.totalProjects,   icon: FolderKanban,  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'Time Entries',     value: stats.totalTimeEntries,icon: Clock,         color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
    { label: 'Completed Tasks',  value: stats.completedTasks,  icon: UserCheck,     color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
    { label: 'Active Projects',  value: stats.activeProjects,  icon: Activity,      color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
    { label: 'New Users (7d)',   value: stats.newUsersThisWeek,icon: TrendingUp,    color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  ] : []

  if (isLoading) return (
    <div style={{ padding: isMobile ? '16px' : '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{ height: '100px', backgroundColor: colors.card, borderRadius: '14px', border: `1px solid ${colors.border}` }} />
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.text, margin: 0 }}>
          Admin Dashboard
        </h1>
        <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
          Platform overview and analytics
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: '12px', marginBottom: '28px'
      }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{
            backgroundColor: colors.card, borderRadius: '14px',
            border: `1px solid ${colors.border}`, padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, margin: 0 }}>{value?.toLocaleString()}</p>
            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '4px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts + Active Users */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '16px', marginBottom: '28px'
      }}>
        {/* Signups Chart */}
        <div style={{
          backgroundColor: colors.card, borderRadius: '16px',
          border: `1px solid ${colors.border}`, padding: '24px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 20px' }}>
            New Signups (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.signupsPerDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="date" tick={{ fill: colors.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: colors.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.tooltip, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.text }}
              />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} name="Signups" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Health */}
        <div style={{
          backgroundColor: colors.card, borderRadius: '16px',
          border: `1px solid ${colors.border}`, padding: '24px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 20px' }}>
            Platform Health
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {stats && [
              { label: 'Task Completion Rate', value: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0, color: '#4ade80' },
              { label: 'Active Projects Rate', value: stats.totalProjects > 0 ? Math.round((stats.activeProjects / stats.totalProjects) * 100) : 0, color: '#60a5fa' },
              { label: 'New Users This Week', value: stats.totalUsers > 0 ? Math.round((stats.newUsersThisWeek / stats.totalUsers) * 100) : 0, color: '#f87171' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: colors.textMuted }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color }}>{value}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: colors.subBg, borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${value}%`, backgroundColor: color, borderRadius: '999px', transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most Active Users */}
      <div style={{
        backgroundColor: colors.card, borderRadius: '16px',
        border: `1px solid ${colors.border}`, padding: '24px'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 20px' }}>
          Most Active Users
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeUsers.slice(0, 8).map((u: any, i: number) => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px', borderRadius: '10px',
              backgroundColor: colors.subBg,
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: `hsl(${i * 40}, 70%, 60%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0
              }}>
                {u.firstName[0]}{u.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: 0 }}>
                  {u.firstName} {u.lastName}
                </p>
                <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', margin: 0 }}>{u._count.tasks}</p>
                  <p style={{ fontSize: '10px', color: colors.textMuted, margin: 0 }}>tasks</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#a78bfa', margin: 0 }}>{u._count.projects}</p>
                  <p style={{ fontSize: '10px', color: colors.textMuted, margin: 0 }}>projects</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#fb923c', margin: 0 }}>{u._count.timeEntries}</p>
                  <p style={{ fontSize: '10px', color: colors.textMuted, margin: 0 }}>entries</p>
                </div>
              </div>
            </div>
          ))}
          {activeUsers.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              No users yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}