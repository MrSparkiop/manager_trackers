import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useChatThemeStore } from '../store/chatThemeStore'
import { CHAT_THEMES } from '../lib/chatThemes'
import { User, Moon, Sun, Save, Download, Trash2, ShieldCheck, XCircle, Gift, Copy, Check, MessageSquare } from 'lucide-react'
import { useColors } from '../lib/useColors'
import { getInputStyle } from '../lib/formStyles'
import api from '../lib/axios'

export default function SettingsPage() {
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const { chatThemeId, setChatThemeId } = useChatThemeStore()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  })
  const [saved, setSaved] = useState(false)
  const { toggle } = useThemeStore()

  // GDPR state
  const [exporting, setExporting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletionPending, setDeletionPending] = useState(!!user?.deletionScheduledFor)
  const [scheduledFor, setScheduledFor] = useState(user?.deletionScheduledFor || '')
  const [gdprLoading, setGdprLoading] = useState(false)

  const colors = useColors(isDark)

  const inputStyle = getInputStyle(colors)

  const card = {
    backgroundColor: colors.card, borderRadius: '16px',
    border: `1px solid ${colors.border}`, padding: '24px',
    marginBottom: '16px'
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await api.get('/gdpr/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'trackflow-data-export.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleRequestDeletion = async () => {
    setGdprLoading(true)
    try {
      const res = await api.post('/gdpr/delete-account')
      setDeletionPending(true)
      setScheduledFor(res.data.scheduledFor)
      setShowDeleteModal(false)
      setDeleteConfirmText('')
    } catch {
      alert('Failed to request account deletion.')
    } finally {
      setGdprLoading(false)
    }
  }

  const handleCancelDeletion = async () => {
    setGdprLoading(true)
    try {
      await api.post('/gdpr/cancel-deletion')
      setDeletionPending(false)
      setScheduledFor('')
    } catch {
      alert('Failed to cancel deletion.')
    } finally {
      setGdprLoading(false)
    }
  }

  const getDaysRemaining = () => {
    if (!scheduledFor) return 0
    const diff = new Date(scheduledFor).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: '0 0 8px' }}>Settings</h1>
        <p style={{ color: colors.textMuted, marginBottom: '28px', fontSize: '14px' }}>Manage your account and preferences</p>

        {/* Profile */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="#6366f1" /> Profile Information
          </h2>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', backgroundColor: '#6366f1',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '24px', fontWeight: '700', color: '#ffffff'
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: 0 }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>First Name</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Last Name</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </div>
            <button type="submit" style={{
              display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              backgroundColor: saved ? '#22c55e' : '#6366f1', color: '#ffffff',
              border: 'none', borderRadius: '10px', padding: '10px 20px',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              transition: 'background-color 0.2s', width: 'fit-content'
            }}>
              <Save size={15} />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Appearance */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDark ? <Moon size={16} color="#6366f1" /> : <Sun size={16} color="#6366f1" />} Appearance
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text, margin: 0 }}>Theme</p>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>
                Currently using {isDark ? 'dark' : 'light'} mode
              </p>
            </div>
            <button onClick={toggle} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              border: `1px solid ${colors.border}`,
              borderRadius: '10px', padding: '10px 16px',
              color: colors.text, fontSize: '14px', fontWeight: '500',
              cursor: 'pointer'
            }}>
              {isDark ? <><Sun size={15} /> Light Mode</> : <><Moon size={15} /> Dark Mode</>}
            </button>
          </div>
        </div>

        {/* Chat Theme */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} color="#6366f1" /> Chat Theme
          </h2>
          <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 20px' }}>
            Give your chat a personality. From brutally 90s to criminally pink.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {CHAT_THEMES.map(theme => {
              const isSelected = chatThemeId === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => setChatThemeId(theme.id)}
                  style={{
                    border: isSelected ? '2px solid #6366f1' : `2px solid ${colors.border}`,
                    borderRadius: '12px', padding: '0', cursor: 'pointer',
                    backgroundColor: 'transparent', textAlign: 'left', overflow: 'hidden',
                    outline: 'none', transition: 'border-color 0.15s, transform 0.1s',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.25)' : 'none',
                  }}
                >
                  {/* Mini chat preview */}
                  <div style={{
                    height: '80px', padding: '8px',
                    background: theme.id === 'default'
                      ? (isDark ? '#0f172a' : '#f1f5f9')
                      : theme.bg,
                    display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'flex-end',
                    fontFamily: theme.font,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {/* Scanlines for terminal-y themes */}
                    {theme.scanlines && (
                      <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)',
                      }} />
                    )}
                    {/* Their bubble */}
                    <div style={{
                      alignSelf: 'flex-start',
                      background: theme.id === 'default' ? (isDark ? '#1e293b' : '#e2e8f0') : theme.theirBubble,
                      color: theme.id === 'default' ? (isDark ? '#e2e8f0' : '#0f172a') : theme.theirText,
                      borderRadius: theme.bubbleRadius ?? '12px',
                      padding: '3px 7px', fontSize: '9px',
                      border: theme.borderStyle ? `${theme.borderStyle} ${theme.border}` : 'none',
                      maxWidth: '70%',
                    }}>
                      Hello! 👋
                    </div>
                    {/* My bubble */}
                    <div style={{
                      alignSelf: 'flex-end',
                      background: theme.myBubble.startsWith('linear') ? theme.myBubble : theme.myBubble,
                      backgroundImage: theme.myBubble.startsWith('linear') ? theme.myBubble : undefined,
                      backgroundColor: !theme.myBubble.startsWith('linear') ? theme.myBubble : undefined,
                      color: theme.myText,
                      borderRadius: theme.bubbleRadius ?? '12px',
                      padding: '3px 7px', fontSize: '9px',
                      border: theme.borderStyle ? `${theme.borderStyle} ${theme.border}` : 'none',
                      maxWidth: '70%',
                    }}>
                      Hi there!
                    </div>
                  </div>
                  {/* Label */}
                  <div style={{
                    padding: '8px 10px',
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    borderTop: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '14px' }}>{theme.emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: colors.text }}>{theme.name}</span>
                      {isSelected && (
                        <span style={{
                          marginLeft: 'auto', fontSize: '9px', fontWeight: '700',
                          color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)',
                          padding: '1px 5px', borderRadius: '4px',
                        }}>ON</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Account Info */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 16px' }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Member since', value: 'February 2026' },
              { label: 'Status', value: 'Active' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '14px', color: colors.textMuted }}>{label}</span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: '14px', color: colors.textMuted }}>Account type</span>
              <span style={{
                padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700',
                background: user?.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' :
                            user?.role === 'PRO'   ? 'linear-gradient(135deg, #f59e0b, #f97316)' :
                            'rgba(99,102,241,0.15)',
                color: user?.role === 'ADMIN' ? '#f87171' :
                       user?.role === 'PRO'   ? '#fff' :
                       '#818cf8',
              }}>
                {user?.role === 'ADMIN' ? '👑 Admin' :
                 user?.role === 'PRO'   ? '✨ Pro' :
                 'Personal'}
              </span>
            </div>
          </div>
        </div>

        {/* Referral */}
        {user?.referralCode && (
          <div style={card}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={16} color="#6366f1" /> Refer a Friend
            </h2>
            <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 16px' }}>
              Share your referral link. When a friend signs up, you both get 1 month of PRO free.
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                readOnly
                value={`${window.location.origin}/register?ref=${user.referralCode}`}
                style={{ ...inputStyle, flex: 1, fontSize: '13px' }}
              />
              <CopyButton text={`${window.location.origin}/register?ref=${user.referralCode}`} colors={colors} />
            </div>
          </div>
        )}

        {/* GDPR / Data Privacy */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="#6366f1" /> Data &amp; Privacy
          </h2>
          <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 20px' }}>
            Export your data or request account deletion per GDPR regulations.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportData}
              disabled={exporting}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px',
                padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export My Data'}
            </button>

            {!deletionPending ? (
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px',
                  padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
                Delete My Account
              </button>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', flex: 1,
                padding: '12px 16px', borderRadius: '10px',
                backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <XCircle size={16} color="#ef4444" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444', margin: 0 }}>
                    Account deletion scheduled
                  </p>
                  <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>
                    {getDaysRemaining()} days remaining. All data will be permanently deleted.
                  </p>
                </div>
                <button
                  onClick={handleCancelDeletion}
                  disabled={gdprLoading}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#ef4444', cursor: 'pointer',
                  }}
                >
                  {gdprLoading ? '...' : 'Cancel'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete account modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }} onClick={() => setShowDeleteModal(false)}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: colors.card, borderRadius: '16px',
                border: `1px solid ${colors.border}`, padding: '28px',
                maxWidth: '420px', width: '90%',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444', margin: '0 0 8px' }}>
                Delete Account
              </h3>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 20px', lineHeight: '1.6' }}>
                This will schedule your account for permanent deletion in 30 days.
                All your data (tasks, projects, time entries) will be removed. This cannot be undone.
              </p>
              <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>
                Type <strong style={{ color: colors.text }}>DELETE</strong> to confirm
              </label>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{ ...inputStyle, marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                  style={{
                    padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                    backgroundColor: 'transparent', border: `1px solid ${colors.border}`,
                    color: colors.text, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestDeletion}
                  disabled={deleteConfirmText !== 'DELETE' || gdprLoading}
                  style={{
                    padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                    backgroundColor: deleteConfirmText === 'DELETE' ? '#ef4444' : 'rgba(239,68,68,0.3)',
                    border: 'none', color: '#fff', cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  }}
                >
                  {gdprLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text, colors }: { text: string; colors: Record<string, string> }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
      backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.1)',
      border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
      color: copied ? '#22c55e' : '#6366f1', cursor: 'pointer',
    }}>
      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
    </button>
  )
}