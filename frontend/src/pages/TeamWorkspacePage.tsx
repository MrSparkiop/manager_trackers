import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useNavigate, useParams } from 'react-router-dom'
import { Users, Plus, X, Crown, FolderKanban, ArrowLeft, Trash2, Copy, Check, RefreshCw } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#14b8a6', '#3b82f6']

export default function TeamWorkspacePage() {
  const { id } = useParams()
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: '', description: '', color: '#6366f1' })
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'projects' | 'members'>('projects')

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then(r => r.data),
  })

  const createProjectMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/${id}/projects`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      setShowProjectModal(false)
      setProjectForm({ name: '', description: '', color: '#6366f1' })
      toast.success('Project created!')
    },
    onError: () => toast.error('Failed to create project'),
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => api.delete(`/teams/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      toast.success('Project deleted')
    },
    onError: () => toast.error('Failed to delete project'),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/teams/${id}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  const copyInviteLink = async () => {
    const res = await api.get(`/teams/${id}/invite`)
    const link = `${window.location.origin}/app/join?code=${res.data.inviteCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invite link copied!')
  }

  const regenerateCode = async () => {
    await api.post(`/teams/${id}/invite/regenerate`)
    toast.success('Invite code regenerated!')
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

  if (!team) return (
    <div style={{ padding: '32px', textAlign: 'center', color: colors.textMuted }}>Team not found</div>
  )

  const isOwner = team.myRole === 'OWNER'

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Back */}
      <button onClick={() => navigate('/app/teams')} style={{
        display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
        cursor: 'pointer', color: colors.textMuted, fontSize: '14px', marginBottom: '20px', padding: 0
      }}>
        <ArrowLeft size={16} /> Back to Teams
      </button>

      {/* Team Header */}
      <div style={{
        backgroundColor: colors.card, borderRadius: '16px',
        border: `1px solid ${colors.border}`,
        borderTop: `4px solid ${team.color}`,
        padding: '24px', marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              backgroundColor: team.color + '20', border: `1px solid ${team.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: '800', color: team.color
            }}>
              {team.name[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: colors.text, margin: 0 }}>{team.name}</h1>
              {team.description && <p style={{ fontSize: '14px', color: colors.textMuted, margin: '4px 0 0' }}>{team.description}</p>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={copyInviteLink} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', backgroundColor: colors.subBg,
              border: `1px solid ${colors.border}`, borderRadius: '9px',
              color: colors.textMuted, fontSize: '13px', cursor: 'pointer', fontWeight: '500'
            }}>
              {copied ? <><Check size={13} color="#4ade80" /> Copied!</> : <><Copy size={13} /> Copy Invite Link</>}
            </button>
            {isOwner && (
              <button onClick={regenerateCode} title="Regenerate invite code" style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 10px', backgroundColor: colors.subBg,
                border: `1px solid ${colors.border}`, borderRadius: '9px',
                color: colors.textMuted, fontSize: '13px', cursor: 'pointer'
              }}>
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14} color={colors.textMuted} />
            <span style={{ fontSize: '13px', color: colors.textMuted }}>{team.members.length} members</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban size={14} color={colors.textMuted} />
            <span style={{ fontSize: '13px', color: colors.textMuted }}>{team.projects.length} projects</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crown size={13} color="#f59e0b" />
            <span style={{ fontSize: '13px', color: colors.textMuted }}>
              {team.owner.firstName} {team.owner.lastName}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: colors.subBg, borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {(['projects', 'members'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600', textTransform: 'capitalize',
            backgroundColor: activeTab === tab ? colors.card : 'transparent',
            color: activeTab === tab ? colors.text : colors.textMuted,
            boxShadow: activeTab === tab ? `0 1px 3px rgba(0,0,0,0.1)` : 'none',
            transition: 'all 0.15s'
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowProjectModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '10px', color: '#fff',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer'
            }}>
              <Plus size={15} /> New Project
            </button>
          </div>

          {team.projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <FolderKanban size={40} color={colors.textMuted} style={{ margin: '0 auto 16px' }} />
              <p style={{ color: colors.textMuted, fontSize: '14px' }}>No projects yet. Create the first one!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {team.projects.map((project: any) => (
                <div key={project.id} style={{
                  backgroundColor: colors.card, borderRadius: '14px',
                  border: `1px solid ${colors.border}`, padding: '20px',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = project.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigate(`/app/teams/${id}/projects/${project.id}`)}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: project.color, flexShrink: 0 }} />
                      <h3 style={{ fontSize: '14px', fontWeight: '700', color: colors.text, margin: 0 }}>{project.name}</h3>
                    </div>
                    {isOwner && (
                      <button onClick={() => {
                        toast((t) => (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>Delete <strong>{project.name}</strong>?</p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => { deleteProjectMutation.mutate(project.id); toast.dismiss(t.id) }} style={{ backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
                              <button onClick={() => toast.dismiss(t.id)} style={{ backgroundColor: '#334155', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                            </div>
                          </div>
                        ), { duration: 6000 })
                      }} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {project.description && (
                    <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 12px', lineHeight: '1.5' }}>{project.description}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: colors.textMuted }}>{project._count.tasks} tasks</span>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: '600',
                      backgroundColor: project.status === 'ACTIVE' ? 'rgba(52,211,153,0.15)' : 'rgba(100,116,139,0.15)',
                      color: project.status === 'ACTIVE' ? '#34d399' : '#64748b'
                    }}>{project.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {team.members.map((member: any) => (
            <div key={member.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 18px', backgroundColor: colors.card,
              borderRadius: '12px', border: `1px solid ${colors.border}`
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                background: member.role === 'OWNER' ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '700', color: '#fff'
              }}>
                {member.user.firstName[0]}{member.user.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: 0 }}>
                    {member.user.firstName} {member.user.lastName}
                    {member.user.id === (user as any)?.id && <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '400' }}> (you)</span>}
                  </p>
                  {member.role === 'OWNER' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Crown size={11} color="#f59e0b" />
                      <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>Owner</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>{member.user.email}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                  Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {isOwner && member.user.id !== (user as any)?.id && (
                  <button onClick={() => removeMemberMutation.mutate(member.user.id)} style={{
                    padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, borderRadius: '6px'
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showProjectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: colors.card, borderRadius: '20px', border: `1px solid ${colors.border}`, padding: '32px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>New Project</h2>
              <button onClick={() => setShowProjectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Project Name *</label>
                <input value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="e.g. Website Redesign" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Description</label>
                <textarea value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Project description..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setProjectForm({ ...projectForm, color: c })} style={{
                      width: '26px', height: '26px', borderRadius: '50%', backgroundColor: c,
                      border: projectForm.color === c ? '2px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer', outline: projectForm.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px'
                    }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setShowProjectModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', backgroundColor: colors.subBg, border: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button onClick={() => { if (!projectForm.name.trim()) return toast.error('Name required'); createProjectMutation.mutate(projectForm) }}
                  disabled={createProjectMutation.isPending}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}