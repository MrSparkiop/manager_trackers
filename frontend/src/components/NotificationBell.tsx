import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X, CheckCheck, CheckSquare, MessageSquare, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { getSocket } from '../lib/socket'
import { NotificationSkeleton } from './Skeleton'

const typeConfig: Record<string, any> = {
  TASK_ASSIGNED: { icon: CheckSquare, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  TASK_COMMENT:  { icon: MessageSquare, color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  TEAM_JOINED:   { icon: Users, color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  TEAM_REMOVED:  { icon: Users, color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
}

export default function NotificationBell({ isDark }: { isDark: boolean }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const colors = {
    card:      isDark ? '#0f172a' : '#ffffff',
    border:    isDark ? '#1e293b' : '#e2e8f0',
    text:      isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    subBg:     isDark ? '#1e293b' : '#f8fafc',
    hover:     isDark ? '#1e293b' : '#f8fafc',
  }

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  })

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    }
  })

  // Listen for real-time notifications
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    }

    socket.on('notification', handler)
    return () => { socket.off('notification', handler) }
  }, [queryClient])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = unreadData?.count || 0

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) markReadMutation.mutate(notification.id)
    if (notification.link) { navigate(notification.link); setOpen(false) }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', borderRadius: '10px', border: 'none',
          backgroundColor: open ? colors.subBg : 'transparent',
          cursor: 'pointer', color: colors.text, transition: 'all 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.subBg}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = open ? colors.subBg : 'transparent'}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '16px', height: '16px', borderRadius: '50%',
            backgroundColor: '#ef4444', color: '#fff',
            fontSize: '9px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${isDark ? '#0f172a' : '#ffffff'}`
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '44px', right: 'auto', left: '0',
          width: '340px', backgroundColor: colors.card,
          borderRadius: '16px', border: `1px solid ${colors.border}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          zIndex: 100, overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 16px 12px', borderBottom: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: colors.text, margin: 0 }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: '10px', padding: '1px 7px', borderRadius: '999px', fontWeight: '700',
                  backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171'
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={() => markAllReadMutation.mutate()} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: colors.textMuted, fontWeight: '600'
              }}>
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {isLoading ? (
              [...Array(4)].map((_, i) => <NotificationSkeleton key={i} isDark={isDark} />)
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Bell size={28} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n: any) => {
                const config = typeConfig[n.type] || typeConfig.TASK_ASSIGNED
                const Icon = config.icon
                return (
                  <div key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: 'flex', gap: '12px', padding: '12px 16px',
                      borderBottom: `1px solid ${colors.border}`,
                      cursor: n.link ? 'pointer' : 'default',
                      backgroundColor: n.read ? 'transparent' : (isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)'),
                      transition: 'background 0.1s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.hover}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = n.read ? 'transparent' : (isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)')}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                      backgroundColor: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={15} color={config.color} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: n.read ? '500' : '700', color: colors.text, margin: '0 0 2px', lineHeight: '1.3' }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: '11px', color: colors.textMuted, margin: '0 0 4px', lineHeight: '1.4' }}>
                        {n.message}
                      </p>
                      <p style={{ fontSize: '10px', color: colors.textMuted, margin: 0 }}>
                        {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Unread dot + delete */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                      {!n.read && (
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id) }} style={{
                        padding: '2px', background: 'none', border: 'none', cursor: 'pointer',
                        color: colors.textMuted, opacity: 0, transition: 'opacity 0.15s'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#f87171' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = colors.textMuted }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}