import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '../../store/themeStore'
import { useIsMobile } from '../../lib/useIsMobile'
import { Flag, Trash2, AlertTriangle, UserX, X, MessageSquare, CheckCircle } from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pending',   color: '#f59e0b' },
  WARNED:    { label: 'Warned',    color: '#fb923c' },
  DELETED:   { label: 'Deleted',   color: '#ef4444' },
  DISMISSED: { label: 'Dismissed', color: '#64748b' },
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminModerationPage() {
  const { isDark } = useThemeStore()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('')
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [actionNote, setActionNote] = useState('')

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
    queryKey: ['admin-moderation-stats'],
    queryFn: () => api.get('/moderation/admin/stats').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-moderation-reports', statusFilter],
    queryFn: () => {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      return api.get(`/moderation/admin/reports${params}`).then(r => r.data)
    },
    refetchInterval: 15000,
  })

  const syncedReport = selectedReport
    ? reports.find((r: any) => r.id === selectedReport.id) ?? selectedReport
    : null

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-moderation-reports'] })
    queryClient.invalidateQueries({ queryKey: ['admin-moderation-stats'] })
  }

  const deleteMsgMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/moderation/admin/reports/${id}/delete-message`, { note }),
    onSuccess: () => { toast.success('Message deleted'); invalidate(); setSelectedReport(null); setActionNote('') },
    onError: () => toast.error('Action failed'),
  })

  const warnMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/moderation/admin/reports/${id}/warn`, { note }),
    onSuccess: () => { toast.success('User warned'); invalidate(); setSelectedReport(null); setActionNote('') },
    onError: () => toast.error('Action failed'),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/moderation/admin/reports/${id}/suspend`, { note }),
    onSuccess: () => { toast.success('User suspended'); invalidate(); setSelectedReport(null); setActionNote('') },
    onError: () => toast.error('Action failed'),
  })

  const dismissMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/moderation/admin/reports/${id}/dismiss`, { note }),
    onSuccess: () => { toast.success('Report dismissed'); invalidate(); setSelectedReport(null); setActionNote('') },
    onError: () => toast.error('Action failed'),
  })

  const isPending = deleteMsgMutation.isPending || warnMutation.isPending || suspendMutation.isPending || dismissMutation.isPending

  const statCards = [
    { label: 'Pending', value: stats?.pending ?? '—', color: '#f59e0b' },
    { label: 'Warned', value: stats?.warned ?? '—', color: '#fb923c' },
    { label: 'Deleted', value: stats?.deleted ?? '—', color: '#ef4444' },
    { label: 'Dismissed', value: stats?.dismissed ?? '—', color: '#64748b' },
  ]

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Flag size={22} color="#ef4444" />
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: c.text }}>Chat Moderation</h1>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: c.muted }}>Review and action reported chat messages</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {statCards.map(({ label, value, color }) => (
          <div key={label} style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: c.muted, fontWeight: '500' }}>{label}</p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[{ value: '', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'WARNED', label: 'Warned' }, { value: 'DELETED', label: 'Deleted' }, { value: 'DISMISSED', label: 'Dismissed' }].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', border: `1px solid ${statusFilter === opt.value ? '#ef4444' : c.border}`,
              backgroundColor: statusFilter === opt.value ? 'rgba(239,68,68,0.1)' : c.card,
              color: statusFilter === opt.value ? '#f87171' : c.muted,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Report list */}
      <div style={{ backgroundColor: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: c.muted, fontSize: '14px' }}>Loading reports…</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <CheckCircle size={32} color={c.muted} style={{ marginBottom: '12px' }} />
            <p style={{ color: c.muted, fontSize: '14px', margin: 0 }}>No reports {statusFilter ? `with status "${statusFilter}"` : 'found'}</p>
          </div>
        ) : (
          reports.map((report: any, i: number) => {
            const cfg = statusConfig[report.status] ?? statusConfig.PENDING
            const sender = report.message?.sender
            const reporter = report.reporter
            return (
              <div
                key={report.id}
                onClick={() => { setSelectedReport(report); setActionNote('') }}
                style={{
                  padding: '14px 18px',
                  borderBottom: i < reports.length - 1 ? `1px solid ${c.border}` : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                  display: 'flex', gap: '14px', alignItems: 'flex-start',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Flag size={14} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: c.text }}>
                      {reporter ? `${reporter.firstName} ${reporter.lastName}` : 'Unknown'} reported {sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown'}
                    </span>
                    <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '999px', backgroundColor: `${cfg.color}20`, color: cfg.color, fontWeight: '700' }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <MessageSquare size={11} color={c.muted} />
                    <span style={{ fontSize: '12px', color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                      {report.message?.content ?? '🎙 Voice message'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: c.muted }}>Reason: <strong style={{ color: c.text }}>{report.reason}</strong></span>
                    <span style={{ fontSize: '11px', color: c.muted }}>{timeAgo(report.createdAt)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail panel / action modal */}
      {syncedReport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedReport(null)}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: c.card, borderRadius: '16px', border: `1px solid ${c.border}`, padding: '24px', width: '100%', maxWidth: '500px', margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: c.text }}>Review Report</h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Message preview */}
            <div style={{ backgroundColor: c.sub, borderRadius: '10px', padding: '14px', marginBottom: '16px', border: `1px solid ${c.border}` }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reported Message</p>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: c.text, lineHeight: '1.5' }}>{syncedReport.message?.content ?? '🎙 Voice message'}</p>
              <p style={{ margin: 0, fontSize: '11px', color: c.muted }}>
                Sent by <strong style={{ color: c.text }}>{syncedReport.message?.sender?.firstName} {syncedReport.message?.sender?.lastName}</strong> ({syncedReport.message?.sender?.email})
              </p>
            </div>

            {/* Report info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Reported by', value: `${syncedReport.reporter?.firstName} ${syncedReport.reporter?.lastName}` },
                { label: 'Reason', value: syncedReport.reason },
                { label: 'Status', value: statusConfig[syncedReport.status]?.label ?? syncedReport.status },
                { label: 'Reported', value: timeAgo(syncedReport.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: c.sub, borderRadius: '8px', padding: '10px', border: `1px solid ${c.border}` }}>
                  <p style={{ margin: '0 0 2px', fontSize: '10px', color: c.muted, fontWeight: '600', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: c.text, fontWeight: '500' }}>{value}</p>
                </div>
              ))}
            </div>

            {syncedReport.adminNote && (
              <div style={{ backgroundColor: 'rgba(251,146,60,0.1)', borderRadius: '8px', padding: '10px', marginBottom: '16px', border: '1px solid rgba(251,146,60,0.2)' }}>
                <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '600', color: '#fb923c', textTransform: 'uppercase' }}>Admin Note</p>
                <p style={{ margin: 0, fontSize: '13px', color: c.text }}>{syncedReport.adminNote}</p>
              </div>
            )}

            {syncedReport.status === 'PENDING' && (
              <>
                <textarea
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  placeholder="Optional admin note (reason for action)…"
                  rows={2}
                  style={{ width: '100%', backgroundColor: c.input, border: `1px solid ${c.inputBorder}`, borderRadius: '8px', padding: '10px', color: c.text, fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => deleteMsgMutation.mutate({ id: syncedReport.id, note: actionNote })}
                    disabled={isPending}
                    style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} /> Delete Message
                  </button>
                  <button
                    onClick={() => warnMutation.mutate({ id: syncedReport.id, note: actionNote })}
                    disabled={isPending}
                    style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#fb923c', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={14} /> Warn User
                  </button>
                  <button
                    onClick={() => suspendMutation.mutate({ id: syncedReport.id, note: actionNote })}
                    disabled={isPending}
                    style={{ padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <UserX size={14} /> Suspend User
                  </button>
                  <button
                    onClick={() => dismissMutation.mutate({ id: syncedReport.id, note: actionNote })}
                    disabled={isPending}
                    style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${c.border}`, backgroundColor: 'transparent', color: c.muted, cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <X size={14} /> Dismiss
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
