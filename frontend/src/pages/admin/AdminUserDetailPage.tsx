import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { ArrowLeft, Crown, Ban, CheckSquare, FolderKanban, Clock, Calendar, Tag, Shield, Trash2 } from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()

  const colors = {
    card:      isDark ? '#0f172a' : '#ffffff',
    border:    isDark ? '#1e293b' : '#e2e8f0',
    text:      isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    subBg:     isDark ? '#1e293b' : '#f8fafc',
  }

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => api.get(`/admin/users/${id}`).then(r => r.data),
  })

  const suspendMutation = useMutation({
    mutationFn: (isSuspended: boolean) => api.put(`/admin/users/${id}/suspend`, { isSuspended }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(res.data.isSuspended ? 'User suspended' : 'User unsuspended')
    },
    onError: () => toast.error('Failed to update suspension')
  })

  const roleMutation = useMutation({
    mutationFn: (role: string) => api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Role updated!')
    },
    onError: () => toast.error('Failed to update role')
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User deleted')
      navigate('/admin/users')
    },
    onError: () => toast.error('Failed to delete user')
  })

  const statusColors: Record<string, string> = {
    TODO: '#64748b', IN_PROGRESS: '#60a5fa', DONE: '#4ade80',
    CANCELLED: '#f87171', HIGH: '#fb923c', URGENT: '#f87171',
    MEDIUM: '#facc15', LOW: '#64748b',
    ACTIVE: '#34d399', COMPLETED: '#4ade80', ARCHIVED: '#64748b', ON_HOLD: '#fb923c',
  }

  if (isLoading) return (
    <div style={{ padding: isMobile ? '16px' : '32px' }}>
      <div style={{ height: '200px', backgroundColor: colors.card, borderRadius: '16px', border: `1px solid ${colors.border}` }} />
    </div>
  )

  if (!user) return (
    <div style={{ padding: '32px', textAlign: 'center', color: colors.textMuted }}>User not found</div>
  )

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Back button */}
      <button onClick={() => navigate('/admin/users')} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'none', border: 'none', cursor: 'pointer',
        color: colors.textMuted, fontSize: '14px', marginBottom: '24px', padding: 0
      }}>
        <ArrowLeft size={16} /> Back to Users
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px' }}>

        {/* Left — Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            backgroundColor: colors.card, borderRadius: '16px',
            border: `1px solid ${colors.border}`, padding: '24px', textAlign: 'center'
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 16px',
              background: user.role === 'ADMIN'
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: '700', color: '#fff'
            }}>
              {user.firstName[0]}{user.lastName[0]}
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: '0 0 4px' }}>
              {user.firstName} {user.lastName}
            </h2>
            <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 16px' }}>{user.email}</p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '999px', fontWeight: '700',
                backgroundColor: user.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                color: user.role === 'ADMIN' ? '#f87171' : '#818cf8',
              }}>
                {user.role === 'ADMIN' ? '👑 ADMIN' : 'USER'}
              </span>
              {user.isSuspended && (
                <span style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '999px', fontWeight: '700',
                  backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171'
                }}>
                  🚫 SUSPENDED
                </span>
              )}
            </div>

            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 20px' }}>
              Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => suspendMutation.mutate(!user.isSuspended)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600',
                backgroundColor: user.isSuspended ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                color: user.isSuspended ? '#4ade80' : '#f87171',
              }}>
                <Ban size={14} />
                {user.isSuspended ? 'Unsuspend User' : 'Suspend User'}
              </button>

              <button onClick={() => roleMutation.mutate(user.role === 'ADMIN' ? 'USER' : 'ADMIN')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600',
                backgroundColor: user.role === 'ADMIN' ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)',
                color: user.role === 'ADMIN' ? '#818cf8' : '#f87171',
              }}>
                {user.role === 'ADMIN' ? <><Shield size={14} /> Revoke Admin</> : <><Crown size={14} /> Make Admin</>}
              </button>

              <button onClick={() => {
                toast((t) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>Delete <strong>{user.firstName} {user.lastName}</strong>?</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>All their data will be permanently deleted.</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { deleteMutation.mutate(); toast.dismiss(t.id) }} style={{
                        backgroundColor: '#ef4444', border: 'none', borderRadius: '6px',
                        padding: '5px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px'
                      }}>Delete</button>
                      <button onClick={() => toast.dismiss(t.id)} style={{
                        backgroundColor: '#334155', border: 'none', borderRadius: '6px',
                        padding: '5px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px'
                      }}>Cancel</button>
                    </div>
                  </div>
                ), { duration: 6000 })
              }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border}`,
                cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                backgroundColor: 'transparent', color: colors.textMuted,
              }}>
                <Trash2 size={14} /> Delete User
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            backgroundColor: colors.card, borderRadius: '16px',
            border: `1px solid ${colors.border}`, padding: '20px'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: colors.textMuted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Stats
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: CheckSquare, label: 'Tasks',    value: user._count.tasks,         color: '#34d399' },
                { icon: FolderKanban, label: 'Projects', value: user._count.projects,      color: '#a78bfa' },
                { icon: Clock,       label: 'Time Logs', value: user._count.timeEntries,   color: '#fb923c' },
                { icon: Calendar,    label: 'Events',    value: user._count.calendarEvents, color: '#f472b6' },
                { icon: Tag,         label: 'Tags',      value: user._count.tags,           color: '#facc15' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{
                  padding: '12px', borderRadius: '10px',
                  backgroundColor: colors.subBg, border: `1px solid ${colors.border}`,
                  textAlign: 'center'
                }}>
                  <Icon size={16} color={color} style={{ margin: '0 auto 6px' }} />
                  <p style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>{value}</p>
                  <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Recent activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Recent Tasks */}
          <div style={{
            backgroundColor: colors.card, borderRadius: '16px',
            border: `1px solid ${colors.border}`, padding: '24px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 16px' }}>
              Recent Tasks
            </h3>
            {user.tasks.length === 0 ? (
              <p style={{ color: colors.textMuted, fontSize: '13px' }}>No tasks yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {user.tasks.map((t: any) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '10px',
                    backgroundColor: colors.subBg, border: `1px solid ${colors.border}`
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: statusColors[t.status] || '#64748b'
                    }} />
                    <span style={{ flex: 1, fontSize: '13px', color: colors.text, fontWeight: '500' }}>{t.title}</span>
                    <span style={{
                      fontSize: '10px', padding: '2px 7px', borderRadius: '999px',
                      backgroundColor: (statusColors[t.priority] || '#64748b') + '20',
                      color: statusColors[t.priority] || '#64748b', fontWeight: '600'
                    }}>{t.priority}</span>
                    <span style={{ fontSize: '11px', color: colors.textMuted }}>
                      {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Projects */}
          <div style={{
            backgroundColor: colors.card, borderRadius: '16px',
            border: `1px solid ${colors.border}`, padding: '24px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: '0 0 16px' }}>
              Recent Projects
            </h3>
            {user.projects.length === 0 ? (
              <p style={{ color: colors.textMuted, fontSize: '13px' }}>No projects yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {user.projects.map((p: any) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '10px',
                    backgroundColor: colors.subBg, border: `1px solid ${colors.border}`
                  }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '13px', color: colors.text, fontWeight: '500' }}>{p.name}</span>
                    <span style={{
                      fontSize: '10px', padding: '2px 7px', borderRadius: '999px',
                      backgroundColor: (statusColors[p.status] || '#64748b') + '20',
                      color: statusColors[p.status] || '#64748b', fontWeight: '600'
                    }}>{p.status}</span>
                    <span style={{ fontSize: '11px', color: colors.textMuted }}>
                      {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}