import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#3b82f6']

export default function TeamSettingsPage() {
  const { id } = useParams()
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' })
  const [copied, setCopied] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    danger:      'rgba(248,113,113,0.1)',
    dangerBorder:'rgba(248,113,113,0.3)',
  }

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then(r => r.data),
  })

  // Load invite code
  const { data: inviteData } = useQuery({
    queryKey: ['team-invite', id],
    queryFn: () => api.get(`/teams/${id}/invite`).then(r => r.data),
    enabled: !!team,
  })

  useEffect(() => {
    if (team) setForm({ name: team.name, description: team.description || '', color: team.color })
  }, [team])

  useEffect(() => {
    if (inviteData) setInviteCode(inviteData.inviteCode)
  }, [inviteData])

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/teams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team updated!')
    },
    onError: () => toast.error('Failed to update team'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team deleted')
      navigate('/app/teams')
    },
    onError: () => toast.error('Failed to delete team'),
  })

  const regenerateMutation = useMutation({
    mutationFn: () => api.post(`/teams/${id}/invite/regenerate`),
    onSuccess: (res) => {
      setInviteCode(res.data.inviteCode)
      queryClient.invalidateQueries({ queryKey: ['team-invite', id] })
      toast.success('Invite code regenerated!')
    },
    onError: () => toast.error('Failed to regenerate code'),
  })

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/app/join?code=${inviteCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invite link copied!')
  }

  const inputStyle = {
    width: '100%', backgroundColor: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px',
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  if (isLoading) return (
    <div style={{ padding: '32px' }}>
      <div style={{ height: '200px', backgroundColor: colors.card, borderRadius: '16px', border: `1px solid ${colors.border}` }} />
    </div>
  )

  if (!team || team.myRole !== 'OWNER') {
    navigate(`/app/teams/${id}`)
    return null
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif', maxWidth: '640px' }}>

      {/* Back */}
      <button onClick={() => navigate(`/app/teams/${id}`)} style={{
        display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
        cursor: 'pointer', color: colors.textMuted, fontSize: '14px', marginBottom: '24px', padding: 0
      }}>
        <ArrowLeft size={16} /> Back to Workspace
      </button>

      <h1 style={{ fontSize: '22px', fontWeight: '800', color: colors.text, margin: '0 0 4px' }}>
        Team Settings
      </h1>
      <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 28px' }}>
        Manage settings for <strong style={{ color: colors.text }}>{team.name}</strong>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── General ────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: colors.card, borderRadius: '16px',
          border: `1px solid ${colors.border}`, padding: '24px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: colors.text, margin: '0 0 20px' }}>
            General
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.textMuted, marginBottom: '6px' }}>
                Team Name *
              </label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Team name"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = colors.inputBorder}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.textMuted, marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What is this team for?"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' as const }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = colors.inputBorder}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.textMuted, marginBottom: '10px' }}>
                Team Color
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                    width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c,
                    border: form.color === c ? '2px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px', transition: 'transform 0.1s',
                    transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                  }} />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px', borderRadius: '12px',
              backgroundColor: colors.subBg, border: `1px solid ${colors.border}`
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '11px',
                backgroundColor: form.color + '20', border: `1px solid ${form.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: '800', color: form.color
              }}>
                {form.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: colors.text, margin: 0 }}>
                  {form.name || 'Team Name'}
                </p>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>
                  {form.description || 'No description'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', height: '4px', width: '48px', borderRadius: '999px', backgroundColor: form.color }} />
            </div>

            <button
              onClick={() => { if (!form.name.trim()) return toast.error('Name required'); updateMutation.mutate(form) }}
              disabled={updateMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                alignSelf: 'flex-start', opacity: updateMutation.isPending ? 0.7 : 1
              }}
            >
              <Save size={15} />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* ── Invite Link ─────────────────────────────────────────── */}
        <div style={{
          backgroundColor: colors.card, borderRadius: '16px',
          border: `1px solid ${colors.border}`, padding: '24px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: colors.text, margin: '0 0 6px' }}>
            Invite Link
          </h2>
          <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 18px' }}>
            Share this link to invite people to your team. Regenerate to invalidate the old link.
          </p>

          <div style={{
            display: 'flex', gap: '8px', padding: '12px 14px',
            backgroundColor: colors.subBg, borderRadius: '10px',
            border: `1px solid ${colors.border}`, marginBottom: '12px',
            alignItems: 'center'
          }}>
            <p style={{
              flex: 1, fontSize: '12px', color: colors.textMuted,
              margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: 'monospace'
            }}>
              {inviteCode
                ? `${window.location.origin}/app/join?code=${inviteCode}`
                : 'Loading...'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={copyInviteLink} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '9px', color: '#fff',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer'
            }}>
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
            </button>
            <button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 16px', backgroundColor: colors.subBg,
                border: `1px solid ${colors.border}`, borderRadius: '9px',
                color: colors.textMuted, fontSize: '13px', fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} style={{ animation: regenerateMutation.isPending ? 'spin 1s linear infinite' : 'none' }} />
              Regenerate
            </button>
          </div>
        </div>

        {/* ── Danger Zone ─────────────────────────────────────────── */}
        <div style={{
          backgroundColor: colors.card, borderRadius: '16px',
          border: `1px solid ${colors.dangerBorder}`,
          padding: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <AlertTriangle size={16} color="#f87171" />
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#f87171', margin: 0 }}>
              Danger Zone
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 18px' }}>
            Deleting the team is permanent. All projects, tasks and comments will be lost.
          </p>
          <button onClick={() => {
            toast((t) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Delete <strong>{team.name}</strong>?
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                  This will permanently delete the team, all projects, tasks and comments. This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { deleteMutation.mutate(); toast.dismiss(t.id) }} style={{
                    backgroundColor: '#ef4444', border: 'none', borderRadius: '6px',
                    padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                  }}>
                    Yes, Delete
                  </button>
                  <button onClick={() => toast.dismiss(t.id)} style={{
                    backgroundColor: '#334155', border: 'none', borderRadius: '6px',
                    padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: '13px'
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            ), { duration: 8000 })
          }} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', backgroundColor: colors.danger,
            border: `1px solid ${colors.dangerBorder}`, borderRadius: '10px',
            color: '#f87171', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>
            <Trash2 size={15} /> Delete Team
          </button>
        </div>

      </div>
    </div>
  )
}