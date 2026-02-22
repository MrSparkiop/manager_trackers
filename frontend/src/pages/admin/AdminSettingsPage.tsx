import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { Settings, Save, Plus, Trash2, ToggleLeft, ToggleRight, Megaphone } from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'

const ANNOUNCEMENT_TYPES = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] as const

const typeColors: Record<string, { color: string; bg: string }> = {
  INFO:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  WARNING: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  ERROR:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  SUCCESS: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
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

  // ── System Config ─────────────────────────────────────────────────
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

  // ── Announcements ─────────────────────────────────────────────────
  const { data: announcements = [] } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => api.get('/admin/announcements').then(r => r.data),
  })

  const [newMsg, setNewMsg]   = useState('')
  const [newType, setNewType] = useState<string>('INFO')

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/announcements', { message: newMsg, type: newType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setNewMsg('')
      toast.success('Announcement created!')
    },
    onError: () => toast.error('Failed to create announcement'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/admin/announcements/${id}`, { active }),
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

  // ── Helpers ───────────────────────────────────────────────────────
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
          {/* Maintenance Mode */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '16px', paddingBottom: '16px', marginBottom: '16px',
            borderBottom: `1px solid ${colors.border}`
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: '0 0 4px' }}>
                Maintenance Mode
              </p>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                Blocks all logins and shows a maintenance message to users
              </p>
            </div>
            <ToggleSwitch
              value={localConfig.maintenanceMode === 'true'}
              onChange={() => toggle('maintenanceMode')}
            />
          </div>

          {/* Maintenance Message */}
          <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: '0 0 8px' }}>
              Maintenance Message
            </p>
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

          {/* Disable Registrations */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '16px', paddingBottom: '16px', marginBottom: '16px',
            borderBottom: `1px solid ${colors.border}`
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: '0 0 4px' }}>
                Disable Registrations
              </p>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                Prevents new users from creating accounts
              </p>
            </div>
            <ToggleSwitch
              value={localConfig.disableRegistrations === 'true'}
              onChange={() => toggle('disableRegistrations')}
            />
          </div>

          {/* Site Name */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: '0 0 8px' }}>
              Site Name
            </p>
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

          <button
            onClick={handleSaveConfig}
            disabled={configMutation.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', backgroundColor: '#ef4444', border: 'none',
              borderRadius: '10px', color: '#fff', fontSize: '13px',
              fontWeight: '600', cursor: configMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: configMutation.isPending ? 0.7 : 1,
            }}
          >
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
              {ANNOUNCEMENT_TYPES.map(t => (
                <button key={t} onClick={() => setNewType(t)} style={{
                  padding: '5px 12px', borderRadius: '999px', border: 'none',
                  cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                  backgroundColor: newType === t ? typeColors[t].bg : colors.subBg,
                  color: newType === t ? typeColors[t].color : colors.textMuted,
                  outline: newType === t ? `1px solid ${typeColors[t].color}` : `1px solid ${colors.border}`,
                }}>
                  {t}
                </button>
              ))}
              <button
                onClick={() => newMsg.trim() && createMutation.mutate()}
                disabled={!newMsg.trim() || createMutation.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginLeft: 'auto', padding: '8px 16px',
                  backgroundColor: '#ef4444', border: 'none',
                  borderRadius: '10px', color: '#fff', fontSize: '13px',
                  fontWeight: '600', cursor: !newMsg.trim() ? 'not-allowed' : 'pointer',
                  opacity: !newMsg.trim() ? 0.5 : 1,
                }}
              >
                <Plus size={13} /> Post
              </button>
            </div>
          </div>

          {/* List */}
          {announcements.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              No announcements yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {announcements.map((a: any) => {
                const tc = typeColors[a.type] || typeColors.INFO
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '10px',
                    backgroundColor: a.active ? tc.bg : colors.subBg,
                    border: `1px solid ${a.active ? tc.color + '40' : colors.border}`,
                    opacity: a.active ? 1 : 0.5,
                  }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 7px',
                      borderRadius: '999px', backgroundColor: tc.bg,
                      color: tc.color, flexShrink: 0,
                      outline: `1px solid ${tc.color}40`
                    }}>
                      {a.type}
                    </span>
                    <p style={{ flex: 1, fontSize: '13px', color: colors.text, margin: 0 }}>
                      {a.message}
                    </p>
                    <ToggleSwitch
                      value={a.active}
                      onChange={() => toggleActiveMutation.mutate({ id: a.id, active: !a.active })}
                    />
                    <button
                      onClick={() => deleteMutation.mutate(a.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: colors.textMuted, padding: '2px', display: 'flex',
                        alignItems: 'center', flexShrink: 0
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                    >
                      <Trash2 size={14} />
                    </button>
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
