import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useNavigate, useParams } from 'react-router-dom'
import { Plus, X, ArrowLeft, MessageSquare, User, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUSES   = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']

const priorityColors: Record<string, string> = {
  LOW: '#64748b', MEDIUM: '#facc15', HIGH: '#fb923c', URGENT: '#f87171'
}
const statusColors: Record<string, string> = {
  TODO: '#64748b', IN_PROGRESS: '#60a5fa', IN_REVIEW: '#a78bfa', DONE: '#4ade80', CANCELLED: '#f87171'
}

export default function TeamProjectPage() {
  const { id: teamId, projectId } = useParams()
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [comment, setComment] = useState<Record<string, string>>({})
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'MEDIUM',
    dueDate: '', assigneeId: ''
  })
  const [statusFilter, setStatusFilter] = useState('ALL')

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['team-tasks', projectId],
    queryFn: () => api.get(`/teams/projects/${projectId}/tasks`).then(r => r.data),
  })

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => api.get(`/teams/${teamId}`).then(r => r.data),
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.post(`/teams/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks', projectId] })
      setShowTaskModal(false)
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assigneeId: '' })
      toast.success('Task created!')
    },
    onError: () => toast.error('Failed to create task'),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      api.put(`/teams/tasks/${taskId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-tasks', projectId] }),
    onError: () => toast.error('Failed to update task'),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.delete(`/teams/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks', projectId] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      api.post(`/teams/tasks/${taskId}/comments`, { content }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks', projectId] })
      setComment({ ...comment, [vars.taskId]: '' })
    },
    onError: () => toast.error('Failed to add comment'),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.delete(`/teams/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-tasks', projectId] }),
    onError: () => toast.error('Failed to delete comment'),
  })

  const project = team?.projects?.find((p: any) => p.id === projectId)
  const members = team?.members || []
  const filteredTasks = statusFilter === 'ALL' ? tasks : tasks.filter((t: any) => t.status === statusFilter)

  const inputStyle = {
    width: '100%', backgroundColor: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px',
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Back */}
      <button onClick={() => navigate(`/app/teams/${teamId}`)} style={{
        display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
        cursor: 'pointer', color: colors.textMuted, fontSize: '14px', marginBottom: '20px', padding: 0
      }}>
        <ArrowLeft size={16} /> Back to Workspace
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {project && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: project.color }} />}
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: colors.text, margin: 0 }}>
              {project?.name || 'Project'}
            </h1>
            <p style={{ fontSize: '13px', color: colors.textMuted, margin: '2px 0 0' }}>
              {tasks.length} tasks · {tasks.filter((t: any) => t.status === 'DONE').length} completed
            </p>
          </div>
        </div>
        <button onClick={() => setShowTaskModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', borderRadius: '10px', color: '#fff',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer'
        }}>
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['ALL', ...STATUSES].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: '600',
            backgroundColor: statusFilter === s
              ? (s === 'ALL' ? '#6366f1' : statusColors[s] || '#6366f1')
              : colors.subBg,
            color: statusFilter === s ? '#fff' : colors.textMuted,
          }}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {isLoading ? (
        [...Array(4)].map((_, i) => (
          <div key={i} style={{ height: '64px', backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '8px' }} />
        ))
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: colors.textMuted }}>
          No tasks yet. Create the first one!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTasks.map((task: any) => (
            <div key={task.id} style={{
              backgroundColor: colors.card, borderRadius: '14px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden', transition: 'border-color 0.15s',
            }}>
              {/* Task row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>

                {/* Status selector */}
                <select value={task.status}
                  onChange={e => updateTaskMutation.mutate({ taskId: task.id, data: { status: e.target.value } })}
                  style={{
                    backgroundColor: statusColors[task.status] + '20',
                    color: statusColors[task.status],
                    border: `1px solid ${statusColors[task.status]}40`,
                    borderRadius: '7px', padding: '3px 6px',
                    fontSize: '11px', fontWeight: '600', cursor: 'pointer', outline: 'none', flexShrink: 0
                  }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '14px', fontWeight: '600', color: colors.text, margin: 0,
                    textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                    opacity: task.status === 'DONE' ? 0.6 : 1,
                  }}>
                    {task.title}
                  </p>
                  {task.assignee && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                      <User size={10} color={colors.textMuted} />
                      <span style={{ fontSize: '11px', color: colors.textMuted }}>
                        {task.assignee.firstName} {task.assignee.lastName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <span style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '999px', fontWeight: '700', flexShrink: 0,
                  backgroundColor: priorityColors[task.priority] + '20',
                  color: priorityColors[task.priority]
                }}>{task.priority}</span>

                {/* Due date */}
                {task.dueDate && (
                  <span style={{ fontSize: '11px', color: colors.textMuted, flexShrink: 0 }}>
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}

                {/* Comments count */}
                <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: expandedTask === task.id ? '#6366f1' : colors.textMuted, padding: '4px', flexShrink: 0
                }}>
                  <MessageSquare size={14} />
                  <span style={{ fontSize: '11px' }}>{task.comments.length}</span>
                  {expandedTask === task.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {/* Delete */}
                <button onClick={() => deleteTaskMutation.mutate(task.id)} style={{
                  padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, flexShrink: 0
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Comments section */}
              {expandedTask === task.id && (
                <div style={{ borderTop: `1px solid ${colors.border}`, padding: '16px', backgroundColor: colors.subBg + '80' }}>
                  {task.description && (
                    <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 14px', lineHeight: '1.5' }}>
                      {task.description}
                    </p>
                  )}

                  {/* Comments */}
                  {task.comments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                      {task.comments.map((c: any) => (
                        <div key={c.id} style={{
                          display: 'flex', gap: '10px',
                          padding: '10px 12px', borderRadius: '10px',
                          backgroundColor: colors.card, border: `1px solid ${colors.border}`
                        }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '700', color: '#fff'
                          }}>
                            {c.authorName[0]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>{c.authorName}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                                  {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {c.userId === (user as any)?.id && (
                                  <button onClick={() => deleteCommentMutation.mutate(c.id)} style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                                    onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                                  >
                                    <X size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p style={{ fontSize: '13px', color: colors.text, margin: 0, lineHeight: '1.5' }}>{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={comment[task.id] || ''}
                      onChange={e => setComment({ ...comment, [task.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && comment[task.id]?.trim()) {
                          addCommentMutation.mutate({ taskId: task.id, content: comment[task.id] })
                        }
                      }}
                      placeholder="Add a comment... (Enter to send)"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={() => {
                        if (comment[task.id]?.trim())
                          addCommentMutation.mutate({ taskId: task.id, content: comment[task.id] })
                      }}
                      style={{
                        padding: '10px 14px', backgroundColor: '#6366f1', border: 'none',
                        borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', flexShrink: 0
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ backgroundColor: colors.card, borderRadius: '20px', border: `1px solid ${colors.border}`, padding: '32px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>New Task</h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Title *</label>
                <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Description</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Task details..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Due Date</label>
                  <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Assign To</label>
                <select value={taskForm.assigneeId} onChange={e => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.firstName} {m.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setShowTaskModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', backgroundColor: colors.subBg, border: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button onClick={() => { if (!taskForm.title.trim()) return toast.error('Title required'); createTaskMutation.mutate(taskForm) }}
                  disabled={createTaskMutation.isPending}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}