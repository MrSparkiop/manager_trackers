import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { Settings, Save, Plus, Trash2, ToggleLeft, ToggleRight, Megaphone, Users, Crown, Shield, Globe } from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const ANNOUNCEMENT_TYPES = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] as const
const TARGET_ROLES = ['ALL', 'USER', 'PRO', 'ADMIN'] as const

const typeColors: Record<string, { color: string; bg: string }> = {
  INFO:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  WARNING: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  ERROR:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  SUCCESS: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
}

const targetConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  ALL:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   icon: Globe,  label: 'Everyone' },
  USER:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Users,  label: 'Regular Users' },
  PRO:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Crown,  label: 'PRO Users' },
  ADMIN: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: Shield, label: 'Admins Only' },
}

export default function AdminSettingsPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const queryClient = useQueryClient()

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  // ── System Config ──────────────────────────────────────────────────
  const { data: config = {} } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api.get('/admin/config').then(r => r.data),
  })

  const [localConfig, setLocalConfig] = useState<Record<string, string>>({})
  useEffect(() => { setLocalConfig(config) }, [config])

  const configMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.put('/admin/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
      toast.success('Settings saved!')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const toggle = (key: string) =>
    setLocalConfig(c => ({ ...c, [key]: c[key] === 'true' ? 'false' : 'true' }))

  const handleSaveConfig = () => configMutation.mutate(localConfig)

  // ── Announcements ──────────────────────────────────────────────────
  const { data: announcements = [] } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => api.get('/admin/announcements').then(r => r.data),
  })

  const [newMsg, setNewMsg]           = useState('')
  const [newTitle, setNewTitle]       = useState('')
  const [newType, setNewType]         = useState<string>('INFO')
  const [newTarget, setNewTarget]     = useState<string>('ALL')

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/announcements', {
      title: newTitle || undefined,
      message: newMsg,
      type: newType,
      targetRole: newTarget,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setNewMsg('')
      setNewTitle('')
      setNewType('INFO')
      setNewTarget('ALL')
      toast.success('Announcement created!')
    },
    onError: () => toast.error('Failed to create announcement'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/admin/announcements/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
    onError: () => toast.error('Failed to update announcement'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement deleted')
    },
    onError: () => toast.error('Failed to delete announcement'),
  })

  // ── Helpers ────────────────────────────────────────────────────────
  const card = (children: React.ReactNode, title: string, icon: React.ReactNode) => (
    <div style={{
      backgroundColor: colors.card, borderRadius: '16px',
      border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '16px 20px', borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.subBg,
      }}>
        {icon}
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: colors.text, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )

  const ToggleSwitch = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: value ? '#4ade80' : colors.textMuted, padding: 0,
      display: 'flex', alignItems: 'center', flexShrink: 0
    }}>
      {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  )

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.text, margin: 0 }}>
          Settings
        </h1>
        <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
          Platform configuration and announcements
        </p>
      </div>

      {/* System Config */}
      {card(
        <>
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '16px', paddingBottom: '16px', marginBottom: '16px',
            borderBottom: `1px solid ${colors.border}`
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: '0 0 4px' }}>Maintenance Mode</p>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>Blocks all logins and shows a maintenance message to users</p>
            </div>
            <ToggleSwitch value={localConfig.maintenanceMode === 'true'} onChange={() => toggle('maintenanceMode')} />
          </div>

          <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: '0 0 8px' }}>Maintenance Message</p>
            <textarea
              value={localConfig.maintenanceMessage || ''}
              onChange={e => setLocalConfig(c => ({ ...c, maintenanceMessage: e.target.value }))}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                borderRadius: '10px', color: colors.text, fontSize: '13px',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const,
                fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '16px', paddingBottom: '16px', marginBottom: '16px',
            borderBottom: `1px solid ${colors.border}`
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: '0 0 4px' }}>Disable Registrations</p>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>Prevents new users from creating accounts</p>
            </div>
            <ToggleSwitch value={localConfig.disableRegistrations === 'true'} onChange={() => toggle('disableRegistrations')} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: '0 0 8px' }}>Site Name</p>
            <input
              value={localConfig.siteName || ''}
              onChange={e => setLocalConfig(c => ({ ...c, siteName: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                borderRadius: '10px', color: colors.text, fontSize: '13px',
                outline: 'none', boxSizing: 'border-box' as const,
              }}
            />
          </div>

          <button onClick={handleSaveConfig} disabled={configMutation.isPending} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', backgroundColor: '#ef4444', border: 'none',
            borderRadius: '10px', color: '#fff', fontSize: '13px',
            fontWeight: '600', cursor: configMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: configMutation.isPending ? 0.7 : 1,
          }}>
            <Save size={14} />
            {configMutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </>,
        'System Configuration',
        <Settings size={16} color="#f87171" />
      )}

      {/* Announcements */}
      {card(
        <>
          {/* Create new */}
          <div style={{
            padding: '16px', borderRadius: '12px',
            backgroundColor: colors.subBg, border: `1px solid ${colors.border}`,
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: '0 0 10px' }}>
              New Announcement
            </p>

            {/* Title (optional) */}
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: '100%', padding: '9px 12px', marginBottom: '8px',
                backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                borderRadius: '10px', color: colors.text, fontSize: '13px',
                outline: 'none', boxSizing: 'border-box' as const,
              }}
            />

            {/* Message */}
            <textarea
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="Enter announcement message…"
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: '10px',
                backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                borderRadius: '10px', color: colors.text, fontSize: '13px',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const,
                fontFamily: 'Inter, sans-serif'
              }}
            />

            {/* Type selector */}
            <p style={{ fontSize: '11px', fontWeight: '600', color: colors.textMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Type
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {ANNOUNCEMENT_TYPES.map(t => (
                <button key={t} onClick={() => setNewType(t)} style={{
                  padding: '5px 12px', borderRadius: '999px', border: 'none',
                  cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                  backgroundColor: newType === t ? typeColors[t].bg : colors.subBg,
                  color: newType === t ? typeColors[t].color : colors.textMuted,
                  outline: newType === t ? `1px solid ${typeColors[t].color}` : `1px solid ${colors.border}`,
                  transition: 'all 0.15s',
                }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Target Role selector */}
            <p style={{ fontSize: '11px', fontWeight: '600', color: colors.textMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Show to
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {TARGET_ROLES.map(r => {
                const cfg = targetConfig[r]
                const Icon = cfg.icon
                const isSelected = newTarget === r
                return (
                  <button key={r} onClick={() => setNewTarget(r)} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '999px', border: 'none',
                    cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                    backgroundColor: isSelected ? cfg.bg : 'transparent',
                    color: isSelected ? cfg.color : colors.textMuted,
                    outline: isSelected ? `1px solid ${cfg.color}` : `1px solid ${colors.border}`,
                    transition: 'all 0.15s',
                  }}>
                    <Icon size={11} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            {/* Preview */}
            {newTarget !== 'ALL' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
                backgroundColor: targetConfig[newTarget].bg,
                border: `1px solid ${targetConfig[newTarget].color}30`,
              }}>
                {(() => { const Icon = targetConfig[newTarget].icon; return <Icon size={12} color={targetConfig[newTarget].color} /> })()}
                <span style={{ fontSize: '11px', color: targetConfig[newTarget].color, fontWeight: '600' }}>
                  This announcement will only be visible to {targetConfig[newTarget].label}
                </span>
              </div>
            )}

            <button
              onClick={() => newMsg.trim() && createMutation.mutate()}
              disabled={!newMsg.trim() || createMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', backgroundColor: '#ef4444', border: 'none',
                borderRadius: '10px', color: '#fff', fontSize: '13px',
                fontWeight: '600', cursor: !newMsg.trim() ? 'not-allowed' : 'pointer',
                opacity: !newMsg.trim() ? 0.5 : 1,
              }}
            >
              <Plus size={13} />
              {createMutation.isPending ? 'Posting…' : 'Post Announcement'}
            </button>
          </div>

          {/* List */}
          {announcements.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              No announcements yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {announcements.map((a: any) => {
                const tc  = typeColors[a.type] || typeColors.INFO
                const trc = targetConfig[a.targetRole || 'ALL']
                const TargetIcon = trc.icon
                return (
                  <div key={a.id} style={{
                    padding: '12px 14px', borderRadius: '10px',
                    backgroundColor: a.isActive ? tc.bg : colors.subBg,
                    border: `1px solid ${a.isActive ? tc.color + '40' : colors.border}`,
                    opacity: a.isActive ? 1 : 0.5,
                    transition: 'all 0.2s',
                  }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: a.message ? '6px' : 0 }}>
                      {/* Type badge */}
                      <span style={{
                        fontSize: '10px', fontWeight: '700', padding: '2px 7px',
                        borderRadius: '999px', backgroundColor: tc.bg,
                        color: tc.color, flexShrink: 0,
                        outline: `1px solid ${tc.color}40`
                      }}>
                        {a.type}
                      </span>

                      {/* Target badge */}
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        fontSize: '10px', fontWeight: '700', padding: '2px 7px',
                        borderRadius: '999px', backgroundColor: trc.bg,
                        color: trc.color, flexShrink: 0,
                        outline: `1px solid ${trc.color}40`
                      }}>
                        <TargetIcon size={9} />
                        {trc.label}
                      </span>

                      {/* Title */}
                      {a.title && (
                        <p style={{ fontSize: '13px', fontWeight: '700', color: colors.text, margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>
                        <ToggleSwitch
                          value={a.isActive}
                          onChange={() => toggleActiveMutation.mutate({ id: a.id, isActive: !a.isActive })}
                        />
                        <button
                          onClick={() => deleteMutation.mutate(a.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.textMuted, padding: '2px', display: 'flex', alignItems: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                          onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Message */}
                    {a.message && (
                      <p style={{ fontSize: '13px', color: colors.text, margin: 0, lineHeight: '1.5' }}>
                        {a.message}
                      </p>
                    )}

                    {/* Footer */}
                    <p style={{ fontSize: '10px', color: colors.textMuted, margin: '6px 0 0' }}>
                      {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </>,
        'Announcements',
        <Megaphone size={16} color="#f87171" />
      )}
    </div>
  )
}