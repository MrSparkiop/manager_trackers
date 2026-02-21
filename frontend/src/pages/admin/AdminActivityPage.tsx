import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { CheckSquare, FolderKanban, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../lib/axios'

export default function AdminActivityPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const [page, setPage] = useState(1)

  const colors = {
    card:      isDark ? '#0f172a' : '#ffffff',
    border:    isDark ? '#1e293b' : '#e2e8f0',
    text:      isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    subBg:     isDark ? '#1e293b' : '#f8fafc',
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity', page],
    queryFn: () => api.get(`/admin/activity?page=${page}&limit=30`).then(r => r.data),
  })

  const typeConfig: Record<string, any> = {
    task:    { icon: CheckSquare, color: '#34d399', bg: 'rgba(52,211,153,0.1)',   label: 'Task' },
    project: { icon: FolderKanban, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Project' },
    user:    { icon: UserPlus,    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   label: 'User' },
  }

  const statusColors: Record<string, string> = {
    TODO: '#64748b', IN_PROGRESS: '#60a5fa', DONE: '#4ade80',
    CANCELLED: '#f87171', ACTIVE: '#34d399', COMPLETED: '#4ade80',
    ARCHIVED: '#64748b', ON_HOLD: '#fb923c', USER: '#818cf8', ADMIN: '#f87171',
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.text, margin: 0 }}>
          Activity Log
        </h1>
        <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
          Recent platform activity across all users
        </p>
      </div>

      <div style={{
        backgroundColor: colors.card, borderRadius: '16px',
        border: `1px solid ${colors.border}`, overflow: 'hidden'
      }}>
        {isLoading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} style={{ height: '64px', borderBottom: `1px solid ${colors.border}` }} />
          ))
        ) : data?.activity?.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: colors.textMuted }}>
            No activity yet
          </div>
        ) : (
          data?.activity?.map((item: any) => {
            const config = typeConfig[item.type]
            const Icon = config.icon
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 20px', borderBottom: `1px solid ${colors.border}`,
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.subBg}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* Type icon */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  backgroundColor: config.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0
                }}>
                  <Icon size={16} color={config.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>
                      {item.user.firstName} {item.user.lastName}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{item.action}</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      "{item.title}"
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <span style={{ fontSize: '11px', color: colors.textMuted }}>{item.user.email}</span>
                    {item.meta && (
                      <span style={{
                        fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                        backgroundColor: (statusColors[item.meta] || '#64748b') + '20',
                        color: statusColors[item.meta] || '#64748b', fontWeight: '600'
                      }}>
                        {item.meta}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: colors.textMuted }}>
                    {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0' }}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', backgroundColor: colors.card,
          border: `1px solid ${colors.border}`, borderRadius: '9px',
          color: page === 1 ? colors.textMuted : colors.text,
          cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px'
        }}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: '13px', color: colors.textMuted, padding: '0 8px' }}>
          Page {page}
        </span>
        <button onClick={() => setPage(p => p + 1)} disabled={data?.activity?.length < 30} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', backgroundColor: colors.card,
          border: `1px solid ${colors.border}`, borderRadius: '9px',
          color: data?.activity?.length < 30 ? colors.textMuted : colors.text,
          cursor: data?.activity?.length < 30 ? 'not-allowed' : 'pointer', fontSize: '13px'
        }}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}