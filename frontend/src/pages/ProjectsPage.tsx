import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Folder, Trash2, Edit2, X, Check } from 'lucide-react'
import api from '../lib/axios'

interface Project {
  id: string
  name: string
  description?: string
  color: string
  status: string
  deadline?: string
  createdAt: string
  _count?: { tasks: number }
  tasks?: { status: string }[]
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4'
]

const STATUS_OPTIONS = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']

const statusStyle: Record<string, { bg: string; text: string }> = {
  ACTIVE:    { bg: 'rgba(34,197,94,0.1)',  text: '#4ade80' },
  ON_HOLD:   { bg: 'rgba(234,179,8,0.1)',  text: '#facc15' },
  COMPLETED: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8' },
  ARCHIVED:  { bg: 'rgba(107,114,128,0.1)',text: '#9ca3af' },
}

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', status: 'ACTIVE', deadline: '' })

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/projects', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); closeModal() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/projects/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); closeModal() }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  })

  const openCreate = () => {
    setEditProject(null)
    setForm({ name: '', description: '', color: '#6366f1', status: 'ACTIVE', deadline: '' })
    setShowModal(true)
  }

  const openEdit = (p: Project) => {
    setEditProject(p)
    setForm({
      name: p.name,
      description: p.description || '',
      color: p.color,
      status: p.status,
      deadline: p.deadline ? p.deadline.split('T')[0] : ''
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditProject(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, deadline: form.deadline || undefined }
    if (editProject) {
      updateMutation.mutate({ id: editProject.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const getProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) return 0
    const done = project.tasks.filter(t => t.status === 'DONE').length
    return Math.round((done / project.tasks.length) * 100)
  }

  const inputStyle = {
    width: '100%', backgroundColor: '#1f2937', border: '1px solid #374151',
    borderRadius: '10px', padding: '10px 14px', color: '#ffffff',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: '#030712' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: 0 }}>Projects</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#6366f1', color: '#ffffff', border: 'none',
          borderRadius: '10px', padding: '10px 18px', fontSize: '14px',
          fontWeight: '600', cursor: 'pointer'
        }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: '#6b7280', paddingTop: '64px' }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <Folder size={48} color="#374151" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: '16px' }}>No projects yet</p>
          <p style={{ color: '#4b5563', fontSize: '14px', marginTop: '4px' }}>Create your first project to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {projects.map(project => {
            const progress = getProgress(project)
            const taskCount = project._count?.tasks || project.tasks?.length || 0
            const doneCount = project.tasks?.filter(t => t.status === 'DONE').length || 0
            const s = statusStyle[project.status] || statusStyle.ACTIVE

            return (
              <div key={project.id} style={{
                backgroundColor: '#111827', borderRadius: '16px',
                border: '1px solid #1f2937', padding: '24px',
                transition: 'border-color 0.2s',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      backgroundColor: project.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Folder size={20} color={project.color} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', margin: 0 }}>
                        {project.name}
                      </h3>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                        backgroundColor: s.bg, color: s.text, fontWeight: '500', marginTop: '4px', display: 'inline-block'
                      }}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(project)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#6b7280', padding: '4px', borderRadius: '6px'
                    }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => {
                      if (confirm('Delete this project?')) deleteMutation.mutate(project.id)
                    }} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#6b7280', padding: '4px', borderRadius: '6px'
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
                    {project.description}
                  </p>
                )}

                {/* Progress */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{doneCount}/{taskCount} tasks</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{progress}%</span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: '#1f2937', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      backgroundColor: project.color, borderRadius: '999px',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>

                {/* Deadline */}
                {project.deadline && (
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    📅 Due {new Date(project.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#111827', borderRadius: '20px',
            border: '1px solid #1f2937', padding: '32px',
            width: '100%', maxWidth: '480px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                {editProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Project Name *</label>
                <input
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Website Redesign" required style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Description</label>
                <textarea
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this project about?"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: c, border: form.color === c ? '2px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {form.color === c && <Check size={12} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Status</label>
                  <select
                    value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Deadline</label>
                  <input
                    type="date" value={form.deadline}
                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: '#1f2937', border: '1px solid #374151',
                  color: '#9ca3af', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}>
                  Cancel
                </button>
                <button type="submit" style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: '#6366f1', border: 'none',
                  color: '#ffffff', cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                }}>
                  {editProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}