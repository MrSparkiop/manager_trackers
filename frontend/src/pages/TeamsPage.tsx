import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Users, Plus, X, Crown, LogIn, Trash2, Settings, Link, Copy, Check } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#3b82f6']

export default function TeamsPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const { user, fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => { fetchMe() }, [])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', color: '#6366f1' })
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data),
  })

  const isPro = (user as any)?.role === 'PRO'
             || (user as any)?.role === 'ADMIN'
             || teams.length > 0

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowCreateModal(false)
      setCreateForm({ name: '', description: '', color: '#6366f1' })
      toast.success('Team created!')
    },
    onError: () => toast.error('Failed to create team'),
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.post('/teams/join', { inviteCode: code }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowJoinModal(false)
      setInviteCode('')
      toast.success('Joined team!')
      navigate(`/app/teams/${res.data.teamId}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Invalid invite code'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team deleted')
    },
    onError: () => toast.error('Failed to delete team'),
  })

  const leaveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Left team')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to leave team'),
  })

  const copyInviteLink = async (teamId: string, inviteCode: string) => {
    const link = `${window.location.origin}/app/join?code=${inviteCode}`
    await navigator.clipboard.writeText(link)
    setCopied(teamId)
    setTimeout(() => setCopied(null), 2000)
    toast.success('Invite link copied!')
  }

  const inputStyle = {
    width: '100%', backgroundColor: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px',
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.text, margin: 0 }}>
            Teams
          </h1>
          <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
            Collaborate with others in shared workspaces
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowJoinModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', backgroundColor: colors.card,
            border: `1px solid ${colors.border}`, borderRadius: '10px',
            color: colors.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>
            <LogIn size={15} /> Join Team
          </button>
          <button onClick={() => isPro ? setShowCreateModal(true) : setShowUpgradeModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px',
            background: isPro ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #f59e0b, #f97316)',
            border: 'none', borderRadius: '10px',
            color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>
            <Plus size={15} /> {isPro ? 'New Team' : '✨ Upgrade to PRO'}
          </button>
        </div>
      </div>

      {/* PRO Banner for non-pro users with no teams */}
      {!isPro && teams.length === 0 && (
        <div style={{
          marginBottom: '24px', padding: '20px 24px', borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '32px' }}>✨</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>
              Upgrade to PRO to create teams
            </p>
            <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>
              PRO users can create unlimited teams, invite members and collaborate on shared projects.
            </p>
          </div>
          <button onClick={() => setShowUpgradeModal(true)} style={{
            padding: '9px 20px', background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            border: 'none', borderRadius: '10px', color: '#fff',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer'
          }}>
            Upgrade Now
          </button>
        </div>
      )}

      {/* Teams Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: '180px', backgroundColor: colors.card, borderRadius: '16px', border: `1px solid ${colors.border}` }} />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={32} color="#818cf8" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: '0 0 8px' }}>
            No teams yet
          </h3>
          <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 24px' }}>
            Create a team or join one with an invite link
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {teams.map((team: any) => (
            <div key={team.id} style={{
              backgroundColor: colors.card, borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = team.color
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${team.color}20`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Color bar */}
              <div style={{ height: '4px', backgroundColor: team.color }} />

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => navigate(`/app/teams/${team.id}`)}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                      backgroundColor: team.color + '20', border: `1px solid ${team.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: '700', color: team.color
                    }}>
                      {team.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: colors.text, margin: 0 }}>
                        {team.name}
                      </h3>
                      {team.myRole === 'OWNER' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Crown size={11} color="#f59e0b" />
                          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>Owner</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        const res = await api.get(`/teams/${team.id}/invite`)
                        copyInviteLink(team.id, res.data.inviteCode)
                      }}
                      title="Copy invite link"
                      style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, borderRadius: '6px' }}
                    >
                      {copied === team.id ? <Check size={14} color="#4ade80" /> : <Link size={14} />}
                    </button>
                    {team.myRole === 'OWNER' ? (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/app/teams/${team.id}/settings`) }}
                          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, borderRadius: '6px' }}
                        >
                          <Settings size={14} />
                        </button>
                        <button onClick={e => {
                          e.stopPropagation()
                          toast((t) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <p style={{ margin: 0, fontSize: '14px' }}>Delete <strong>{team.name}</strong>?</p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>All projects and tasks will be deleted.</p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { deleteMutation.mutate(team.id); toast.dismiss(t.id) }} style={{ backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
                                <button onClick={() => toast.dismiss(t.id)} style={{ backgroundColor: '#334155', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                              </div>
                            </div>
                          ), { duration: 6000 })
                        }} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, borderRadius: '6px' }}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button onClick={e => {
                        e.stopPropagation()
                        leaveMutation.mutate(team.id)
                      }} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                        Leave
                      </button>
                    )}
                  </div>
                </div>

                {team.description && (
                  <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 14px', lineHeight: '1.5' }}>
                    {team.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '16px' }} onClick={() => navigate(`/app/teams/${team.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={13} color={colors.textMuted} />
                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{team._count.members} members</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{team._count.projects} projects</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: colors.card, borderRadius: '20px', border: `1px solid ${colors.border}`, padding: '32px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>Create Team</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Team Name *</label>
                <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Design Team" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Description</label>
                <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="What is this team for?" rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setCreateForm({ ...createForm, color: c })} style={{
                      width: '26px', height: '26px', borderRadius: '50%', backgroundColor: c,
                      border: createForm.color === c ? '2px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer', outline: createForm.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px'
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', backgroundColor: colors.subBg, border: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button onClick={() => { if (!createForm.name.trim()) return toast.error('Name required'); createMutation.mutate(createForm) }}
                  disabled={createMutation.isPending}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  {createMutation.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: colors.card, borderRadius: '20px', border: `1px solid ${colors.border}`, padding: '32px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>Join Team</h2>
              <button onClick={() => setShowJoinModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Invite Code or Link</label>
                <input value={inviteCode} onChange={e => {
                  // Extract code from full URL if pasted
                  const val = e.target.value
                  const match = val.match(/code=([^&]+)/)
                  setInviteCode(match ? match[1] : val)
                }}
                  placeholder="Paste invite link or code..." style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowJoinModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', backgroundColor: colors.subBg, border: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button onClick={() => { if (!inviteCode.trim()) return toast.error('Code required'); joinMutation.mutate(inviteCode.trim()) }}
                  disabled={joinMutation.isPending}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  {joinMutation.isPending ? 'Joining...' : 'Join Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: colors.card, borderRadius: '20px', border: '1px solid rgba(245,158,11,0.3)', padding: '32px', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
            <button onClick={() => setShowUpgradeModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: colors.text, margin: '0 0 12px' }}>Upgrade to PRO</h2>
            <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 24px', lineHeight: '1.6' }}>
              PRO users get access to team workspaces, shared projects, task assignment, and real-time collaboration.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
              {['Create unlimited teams', 'Invite team members', 'Shared projects & tasks', 'Assign tasks to members', 'Task comments & collaboration'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color="#f59e0b" />
                  </div>
                  <span style={{ fontSize: '13px', color: colors.text }}>{f}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 16px' }}>
              Contact your admin to upgrade your account to PRO.
            </p>
            <button onClick={() => setShowUpgradeModal(false)} style={{
              width: '100%', padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer'
            }}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  )
}