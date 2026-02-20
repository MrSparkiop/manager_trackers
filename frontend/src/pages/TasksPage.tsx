import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, CheckCircle2, Circle, Clock, AlertCircle, Trash2, Edit2, ChevronDown } from 'lucide-react'
import api from '../lib/axios'
import { useThemeStore } from '../store/themeStore'
import { TaskRowSkeleton } from '../components/Skeleton'

interface Project { id: string; name: string; color: string }
interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  estimatedTime?: number
  projectId?: string
  project?: Project
  subtasks?: Task[]
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUSES   = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']

const priorityColors: Record<string, { bg: string; color: string }> = {
  URGENT: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  HIGH:   { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  MEDIUM: { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  LOW:    { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  TODO:        { color: '#64748b', icon: Circle,       label: 'To Do' },
  IN_PROGRESS: { color: '#60a5fa', icon: Clock,        label: 'In Progress' },
  IN_REVIEW:   { color: '#a78bfa', icon: ChevronDown,  label: 'In Review' },
  DONE:        { color: '#4ade80', icon: CheckCircle2, label: 'Done' },
  CANCELLED:   { color: '#f87171', icon: X,            label: 'Cancelled' },
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const { isDark } = useThemeStore()
  const [showModal, setShowModal]           = useState(false)
  const [editTask, setEditTask]             = useState<Task | null>(null)
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterProject, setFilterProject]   = useState('')
  const [form, setForm] = useState({
    title: '', description: '', status: 'TODO', priority: 'MEDIUM',
    dueDate: '', estimatedTime: '', projectId: ''
  })

  const colors = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    input: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    subBg: isDark ? '#1e293b' : '#f8fafc',
    modalBg: isDark ? '#0f172a' : '#ffffff',
    filterBg: isDark ? '#0f172a' : '#ffffff',
  }

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', filterStatus, filterPriority, filterProject],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterStatus)   params.append('status', filterStatus)
      if (filterPriority) params.append('priority', filterPriority)
      if (filterProject)  params.append('projectId', filterProject)
      return api.get(`/tasks?${params}`).then(r => r.data)
    }
  })

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); closeModal() }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/tasks/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); closeModal() }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  })

  const openCreate = () => {
    setEditTask(null)
    setForm({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', estimatedTime: '', projectId: '' })
    setShowModal(true)
  }

  const openEdit = (t: Task) => {
    setEditTask(t)
    setForm({
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      estimatedTime: t.estimatedTime ? String(t.estimatedTime) : '',
      projectId: t.projectId || ''
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditTask(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      estimatedTime: form.estimatedTime ? parseInt(form.estimatedTime) : undefined,
      projectId: form.projectId || undefined,
    }
    if (editTask) updateMutation.mutate({ id: editTask.id, data: payload })
    else createMutation.mutate(payload)
  }

  const toggleDone = (task: Task) => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
    updateMutation.mutate({ id: task.id, data: { status: newStatus } })
  }

  const inputStyle = {
    width: '100%', backgroundColor: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px',
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const
  }

  const labelStyle = { display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }

  const grouped: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], CANCELLED: [] }
  tasks.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t) })

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: colors.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: 0 }}>Tasks</h1>
          <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>{tasks.length} tasks total</p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#6366f1', color: '#ffffff', border: 'none',
          borderRadius: '10px', padding: '10px 18px', fontSize: '14px',
          fontWeight: '600', cursor: 'pointer'
        }}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          backgroundColor: colors.filterBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '8px 12px', color: filterStatus ? colors.text : colors.textMuted,
          fontSize: '13px', outline: 'none', cursor: 'pointer'
        }}>
          <option value="">All Statuses</option>
          {STATUSES.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
          backgroundColor: colors.filterBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '8px 12px', color: filterPriority ? colors.text : colors.textMuted,
          fontSize: '13px', outline: 'none', cursor: 'pointer'
        }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{
          backgroundColor: colors.filterBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '8px 12px', color: filterProject ? colors.text : colors.textMuted,
          fontSize: '13px', outline: 'none', cursor: 'pointer'
        }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {(filterStatus || filterPriority || filterProject) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterProject('') }} style={{
            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '8px 12px', color: '#f87171',
            fontSize: '13px', cursor: 'pointer'
          }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[...Array(5)].map((_, i) => <TaskRowSkeleton key={i} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <CheckCircle2 size={48} color={colors.border} style={{ margin: '0 auto 16px' }} />
          <p style={{ color: colors.textMuted, fontSize: '16px' }}>No tasks yet</p>
          <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '4px' }}>Create your first task to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(grouped).map(([status, statusTasks]) => {
            if (statusTasks.length === 0) return null
            const cfg = statusConfig[status]
            const Icon = cfg.icon
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Icon size={15} color={cfg.color} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: cfg.color }}>{cfg.label}</span>
                  <span style={{
                    fontSize: '11px', backgroundColor: colors.subBg, color: colors.textMuted,
                    borderRadius: '999px', padding: '1px 8px', fontWeight: '500'
                  }}>{statusTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {statusTasks.map(task => {
                    const pc = priorityColors[task.priority] || priorityColors.MEDIUM
                    const isDone = task.status === 'DONE'
                    return (
                      <div key={task.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        backgroundColor: colors.card, border: `1px solid ${colors.border}`,
                        borderRadius: '12px', padding: '14px 16px', opacity: isDone ? 0.6 : 1
                      }}>
                        <button onClick={() => toggleDone(task)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: isDone ? '#4ade80' : colors.textMuted, padding: 0, flexShrink: 0,
                          display: 'flex', alignItems: 'center'
                        }}>
                          {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: '14px', fontWeight: '500', color: colors.text, margin: 0,
                            textDecoration: isDone ? 'line-through' : 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {task.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {task.project && (
                              <span style={{ fontSize: '11px', color: task.project.color, fontWeight: '500' }}>
                                ● {task.project.name}
                              </span>
                            )}
                            {task.dueDate && (
                              <span style={{ fontSize: '11px', color: colors.textMuted }}>
                                📅 {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {task.estimatedTime && (
                              <span style={{ fontSize: '11px', color: colors.textMuted }}>
                                ⏱ {task.estimatedTime}m
                              </span>
                            )}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                          backgroundColor: pc.bg, color: pc.color, fontWeight: '600', flexShrink: 0
                        }}>
                          {task.priority}
                        </span>

                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => openEdit(task)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.textMuted, padding: '4px', borderRadius: '6px',
                            display: 'flex', alignItems: 'center'
                          }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate(task.id) }} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.textMuted, padding: '4px', borderRadius: '6px',
                            display: 'flex', alignItems: 'center'
                          }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '16px'
        }}>
          <div style={{
            backgroundColor: colors.modalBg, borderRadius: '20px',
            border: `1px solid ${colors.border}`, padding: '32px',
            width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>
                {editTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Task Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs to be done?" required style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Add more details..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
                </div>
                <div>
                  <label style={labelStyle}>Estimated Time (min)</label>
                  <input type="number" value={form.estimatedTime} onChange={e => setForm({ ...form, estimatedTime: e.target.value })}
                    placeholder="e.g. 60" min="1" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Project</label>
                <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                  color: colors.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}>
                  Cancel
                </button>
                <button type="submit" style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: '#6366f1', border: 'none',
                  color: '#ffffff', cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                }}>
                  {editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}