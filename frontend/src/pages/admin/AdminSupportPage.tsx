import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { MessageSquare, Search, X, Send, Circle, Clock, CheckCircle } from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  OPEN:        { label: 'Open',        color: '#60a5fa', icon: Circle      },
  IN_PROGRESS: { label: 'In Progress', color: '#f59e0b', icon: Clock       },
  RESOLVED:    { label: 'Resolved',    color: '#4ade80', icon: CheckCircle },
  CLOSED:      { label: 'Closed',      color: '#64748b', icon: X           },
}

const priorityColors: Record<string, string> = {
  LOW: '#64748b', NORMAL: '#60a5fa', HIGH: '#fb923c', URGENT: '#f87171',
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminSupportPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const queryClient = useQueryClient()

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [reply, setReply] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [search, setSearch] = useState('')

  const c = {
    bg:          isDark ? '#030712' : '#f1f5f9',
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    muted:       isDark ? '#64748b' : '#94a3b8',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    sub:         isDark ? '#0d1117' : '#f8fafc',
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-support-stats'],
    queryFn: () => api.get('/admin/support/stats').then(r => r.data),
  })

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-support-tickets', statusFilter, priorityFilter, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      if (search) params.append('search', search)
      return api.get(`/admin/support/tickets?${params}`).then(r => r.data)
    },
    refetchInterval: 15000,
  })

  // Sync selected ticket with fresh data
  const syncedTicket = selectedTicket
    ? tickets.find((t: any) => t.id === selectedTicket.id) ?? selectedTicket
    : null

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      api.post(`/admin/support/tickets/${ticketId}/replies`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      setReply('')
      toast.success('Reply sent')
    },
    onError: () => toast.error('Failed to send reply'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: any }) =>
      api.put(`/admin/support/tickets/${ticketId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-support-stats'] })
      toast.success('Ticket updated')
    },
    onError: () => toast.error('Failed to update ticket'),
  })

  const inputStyle = {
    backgroundColor: c.input, border: `1px solid ${c.inputBorder}`,
    borderRadius: '8px', padding: '8px 12px', color: c.text,
    fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const,
  }

  const statItems = stats ? [
    { label: 'Total',       value: stats.total,      color: '#94a3b8' },
    { label: 'Open',        value: stats.open,        color: '#60a5fa' },
    { label: 'In Progress', value: stats.inProgress,  color: '#f59e0b' },
    { label: 'Resolved',    value: stats.resolved,    color: '#4ade80' },
    { label: 'Closed',      value: stats.closed,      color: '#64748b' },
  ] : []

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: c.bg }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: c.text, margin: '0 0 4px' }}>Support Tickets</h1>
        <p style={{ fontSize: '13px', color: c.muted, margin: 0 }}>Manage and respond to user support requests</p>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {statItems.map(({ label, value, color }) => (
            <div key={label} style={{
              backgroundColor: c.card, border: `1px solid ${c.border}`,
              borderRadius: '12px', padding: '14px 20px', flex: 1, minWidth: '80px',
            }}>
              <p style={{ fontSize: '22px', fontWeight: '700', color, margin: 0 }}>{value}</p>
              <p style={{ fontSize: '12px', color: c.muted, margin: '2px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Left — ticket list */}
        <div style={{ backgroundColor: c.card, borderRadius: '16px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
          {/* Filters */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: c.sub, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '7px 10px' }}>
              <Search size={13} color={c.muted} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets..."
                style={{ background: 'none', border: 'none', outline: 'none', color: c.text, fontSize: '13px', flex: 1 }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex' }}><X size={12} /></button>}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
                <option value="">All Status</option>
                {Object.entries(statusConfig).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
              </select>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
                <option value="">All Priority</option>
                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Ticket rows */}
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>Loading...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>No tickets found</div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {tickets.map((ticket: any) => {
                const cfg = statusConfig[ticket.status]
                const StatusIcon = cfg.icon
                const isSelected = selectedTicket?.id === ticket.id
                return (
                  <button key={ticket.id} onClick={() => setSelectedTicket(ticket)} style={{
                    width: '100%', display: 'flex', gap: '10px', padding: '12px 16px',
                    border: 'none', borderBottom: `1px solid ${c.border}`,
                    backgroundColor: isSelected ? (isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)') : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    borderLeft: isSelected ? '3px solid #ef4444' : '3px solid transparent',
                  }}>
                    <StatusIcon size={13} color={cfg.color} style={{ flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: c.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.subject}
                      </p>
                      <p style={{ fontSize: '11px', color: c.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.user.firstName} {ticket.user.lastName} · {ticket.user.email}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                        <span style={{ fontSize: '10px', color: cfg.color, fontWeight: '600' }}>{cfg.label}</span>
                        <span style={{ fontSize: '10px', color: priorityColors[ticket.priority], fontWeight: '600' }}>{ticket.priority}</span>
                        <span style={{ fontSize: '10px', color: c.muted }}>{timeAgo(ticket.updatedAt)}</span>
                        {ticket._count?.replies > 0 && <span style={{ fontSize: '10px', color: c.muted }}>💬 {ticket._count.replies}</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — ticket detail */}
        {syncedTicket ? (
          <div style={{ backgroundColor: c.card, borderRadius: '16px', border: `1px solid ${c.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: c.text, margin: '0 0 10px' }}>{syncedTicket.subject}</h2>

              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 14px', backgroundColor: c.sub, borderRadius: '10px', border: `1px solid ${c.border}` }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {syncedTicket.user.firstName[0]}{syncedTicket.user.lastName[0]}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: c.text, margin: 0 }}>{syncedTicket.user.firstName} {syncedTicket.user.lastName}</p>
                  <p style={{ fontSize: '11px', color: c.muted, margin: 0 }}>{syncedTicket.user.email}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: c.muted }}>{syncedTicket.category}</span>
              </div>

              {/* Status + Priority controls */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={syncedTicket.status}
                  onChange={e => updateMutation.mutate({ ticketId: syncedTicket.id, data: { status: e.target.value } })}
                  style={{ ...inputStyle, cursor: 'pointer', color: statusConfig[syncedTicket.status].color, fontWeight: '600' }}
                >
                  {Object.entries(statusConfig).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
                </select>
                <select
                  value={syncedTicket.priority}
                  onChange={e => updateMutation.mutate({ ticketId: syncedTicket.id, data: { priority: e.target.value } })}
                  style={{ ...inputStyle, cursor: 'pointer', color: priorityColors[syncedTicket.priority], fontWeight: '600' }}
                >
                  {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Conversation */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '440px', overflowY: 'auto' }}>
              {/* Original */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {syncedTicket.user.firstName[0]}{syncedTicket.user.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: c.text }}>{syncedTicket.user.firstName} {syncedTicket.user.lastName}</span>
                    <span style={{ fontSize: '11px', color: c.muted }}>{timeAgo(syncedTicket.createdAt)}</span>
                    <span style={{ fontSize: '10px', color: c.muted, marginLeft: 'auto' }}>Original</span>
                  </div>
                  <div style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: '12px', padding: '12px 16px', border: `1px solid ${c.border}` }}>
                    <p style={{ fontSize: '13px', color: c.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{syncedTicket.description}</p>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {syncedTicket.replies?.map((r: any) => (
                <div key={r.id} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: r.isStaff ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {r.author.firstName[0]}{r.author.lastName[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: c.text }}>{r.author.firstName} {r.author.lastName}</span>
                      {r.isStaff && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: '700' }}>SUPPORT</span>}
                      <span style={{ fontSize: '11px', color: c.muted }}>{timeAgo(r.createdAt)}</span>
                    </div>
                    <div style={{ backgroundColor: r.isStaff ? 'rgba(239,68,68,0.06)' : (isDark ? '#1e293b' : '#f1f5f9'), border: r.isStaff ? '1px solid rgba(239,68,68,0.15)' : `1px solid ${c.border}`, borderRadius: '12px', padding: '12px 16px' }}>
                      <p style={{ fontSize: '13px', color: c.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && reply.trim()) replyMutation.mutate({ ticketId: syncedTicket.id, content: reply.trim() }) }}
                  placeholder="Write a reply as support staff... (Ctrl+Enter to send)"
                  rows={2}
                  style={{ ...inputStyle, resize: 'none', flex: 1, width: '100%' }}
                />
                <button
                  onClick={() => { if (reply.trim()) replyMutation.mutate({ ticketId: syncedTicket.id, content: reply.trim() }) }}
                  disabled={!reply.trim() || replyMutation.isPending}
                  style={{ backgroundColor: reply.trim() ? '#ef4444' : c.inputBorder, border: 'none', borderRadius: '10px', padding: '10px 14px', color: '#fff', cursor: reply.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                >
                  <Send size={15} />
                </button>
              </div>
              <p style={{ fontSize: '11px', color: c.muted, margin: '6px 0 0' }}>
                Your reply will be marked as <strong style={{ color: '#f87171' }}>SUPPORT</strong> and the user will be notified.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: c.card, borderRadius: '16px', border: `1px solid ${c.border}`, padding: '64px 32px', textAlign: 'center' }}>
            <MessageSquare size={40} color={c.muted} style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: '15px', fontWeight: '600', color: c.text, margin: '0 0 6px' }}>Select a ticket</p>
            <p style={{ fontSize: '13px', color: c.muted, margin: 0 }}>Click a ticket from the list to view and respond</p>
          </div>
        )}
      </div>
    </div>
  )
}