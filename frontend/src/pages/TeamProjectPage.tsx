import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useNavigate, useParams } from 'react-router-dom'
import { Plus, X, ArrowLeft, MessageSquare, User, Trash2, ChevronDown, ChevronUp, LayoutList, LayoutDashboard, CheckSquare } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { TaskRowSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUSES   = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']

const priorityColors: Record<string, string> = {
  LOW: '#64748b', MEDIUM: '#facc15', HIGH: '#fb923c', URGENT: '#f87171'
}
const statusColors: Record<string, string> = {
  TODO: '#64748b', IN_PROGRESS: '#60a5fa', IN_REVIEW: '#a78bfa', DONE: '#4ade80', CANCELLED: '#f87171'
}
const statusLabels: Record<string, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done', CANCELLED: 'Cancelled'
}
const KANBAN_COLUMNS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']

export default function TeamProjectPage() {
  const { id: teamId, projectId } = useParams()
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [comment, setComment] = useState<Record<string, string>>({})
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assigneeId: '' })
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const dragTaskId = useRef<string | null>(null)

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    kanbanCol:   isDark ? '#0b1120' : '#f1f5f9',
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

  // ── Drag handlers ─────────────────────────────────────────────────
  const handleDragStart = (taskId: string) => {
    dragTaskId.current = taskId
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!dragTaskId.current) return
    const task = tasks.find((t: any) => t.id === dragTaskId.current)
    if (task && task.status !== status) {
      updateTaskMutation.mutate({ taskId: dragTaskId.current, data: { status } })
    }
    dragTaskId.current = null
  }

  const handleDragEnd = () => {
    setDragOverColumn(null)
    dragTaskId.current = null
  }

  const inputStyle = {
    width: '100%', backgroundColor: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px',
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  // ── Task Card (shared between list and kanban) ────────────────────
  const TaskCard = ({ task, kanban = false }: { task: any; kanban?: boolean }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(task.id)}
      onDragEnd={handleDragEnd}
      style={{
        backgroundColor: colors.card, borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden', transition: 'all 0.15s',
        cursor: 'grab', marginBottom: kanban ? '8px' : '0',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = statusColors[task.status]
        e.currentTarget.style.boxShadow = `0 4px 12px ${statusColors[task.status]}20`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = colors.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ padding: kanban ? '12px' : '14px 16px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: kanban ? '10px' : '0' }}>
          {!kanban && (
            <select value={task.status}
              onChange={e => updateTaskMutation.mutate({ taskId: task.id, data: { status: e.target.value } })}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: statusColors[task.status] + '20',
                color: statusColors[task.status],
                border: `1px solid ${statusColors[task.status]}40`,
                borderRadius: '7px', padding: '3px 6px',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer', outline: 'none', flexShrink: 0
              }}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: kanban ? '13px' : '14px', fontWeight: '600', color: colors.text, margin: 0,
              textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
              opacity: task.status === 'DONE' ? 0.6 : 1,
              lineHeight: '1.4',
            }}>
              {task.title}
            </p>
            {task.description && kanban && (
              <p style={{ fontSize: '11px', color: colors.textMuted, margin: '4px 0 0', lineHeight: '1.4',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                {task.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)} style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: expandedTask === task.id ? '#6366f1' : colors.textMuted, padding: '4px',
            }}>
              <MessageSquare size={13} />
              {task.comments.length > 0 && (
                <span style={{ fontSize: '10px' }}>{task.comments.length}</span>
              )}
            </button>
            <button onClick={() => deleteTaskMutation.mutate(task.id)} style={{
              padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted,
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Bottom row — assignee, priority, due date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: kanban ? '8px' : '4px' }}>
          {task.assignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: '700', color: '#fff', flexShrink: 0
              }}>
                {task.assignee.firstName[0]}
              </div>
              <span style={{ fontSize: '11px', color: colors.textMuted }}>
                {task.assignee.firstName}
              </span>
            </div>
          )}

          <span style={{
            fontSize: '10px', padding: '1px 6px', borderRadius: '999px', fontWeight: '700',
            backgroundColor: priorityColors[task.priority] + '20',
            color: priorityColors[task.priority], marginLeft: 'auto'
          }}>{task.priority}</span>

          {task.dueDate && (
            <span style={{ fontSize: '10px', color: colors.textMuted }}>
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Comments section */}
      {expandedTask === task.id && (
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: '14px', backgroundColor: colors.subBg + '80' }}>
          {task.description && !kanban && (
            <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 12px', lineHeight: '1.5' }}>
              {task.description}
            </p>
          )}
          {task.comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {task.comments.map((c: any) => (
                <div key={c.id} style={{
                  display: 'flex', gap: '8px', padding: '10px 12px',
                  borderRadius: '10px', backgroundColor: colors.card, border: `1px solid ${colors.border}`
                }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: '700', color: '#fff'
                  }}>
                    {c.authorName[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>{c.authorName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', color: colors.textMuted }}>
                          {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {c.userId === (user as any)?.id && (
                          <button onClick={() => deleteCommentMutation.mutate(c.id)} style={{ padding: '2px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                            onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: colors.text, margin: 0, lineHeight: '1.5' }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={comment[task.id] || ''}
              onChange={e => setComment({ ...comment, [task.id]: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && comment[task.id]?.trim()) {
                  addCommentMutation.mutate({ taskId: task.id, content: comment[task.id] })
                }
              }}
              placeholder="Add a comment..."
              style={{ ...inputStyle, flex: 1, fontSize: '13px', padding: '8px 12px' }}
            />
            <button onClick={() => { if (comment[task.id]?.trim()) addCommentMutation.mutate({ taskId: task.id, content: comment[task.id] }) }}
              style={{ padding: '8px 14px', backgroundColor: '#6366f1', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '2px', backgroundColor: colors.subBg, borderRadius: '10px', padding: '3px', border: `1px solid ${colors.border}` }}>
            <button onClick={() => setView('list')} title="List view" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: view === 'list' ? colors.card : 'transparent',
              color: view === 'list' ? colors.text : colors.textMuted,
              boxShadow: view === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s'
            }}>
              <LayoutList size={15} />
            </button>
            <button onClick={() => setView('kanban')} title="Kanban view" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: view === 'kanban' ? colors.card : 'transparent',
              color: view === 'kanban' ? colors.text : colors.textMuted,
              boxShadow: view === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s'
            }}>
              <LayoutDashboard size={15} />
            </button>
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
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['ALL', ...STATUSES].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600',
                backgroundColor: statusFilter === s ? (s === 'ALL' ? '#6366f1' : statusColors[s]) : colors.subBg,
                color: statusFilter === s ? '#fff' : colors.textMuted,
              }}>
                {s === 'ALL' ? `All (${tasks.length})` : `${statusLabels[s]} (${tasks.filter((t: any) => t.status === s).length})`}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(5)].map((_, i) => <TaskRowSkeleton key={i} isDark={isDark} />)}
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase().replace('_', ' ')} tasks` : 'No tasks yet'}
              description={statusFilter !== 'ALL' ? 'Try a different filter or create a new task.' : 'Create the first task for this project and assign it to a team member.'}
              action={{ label: '+ New Task', onClick: () => setShowTaskModal(true) }}
              isDark={isDark}
              color={project?.color || '#6366f1'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTasks.map((task: any) => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </>
      )}

      {/* ── KANBAN VIEW ────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(220px, 1fr))',
          gap: '14px',
          overflowX: isMobile ? 'visible' : 'auto',
          paddingBottom: '16px',
        }}>
          {KANBAN_COLUMNS.map(status => {
            const columnTasks = tasks.filter((t: any) => t.status === status)
            const isDragTarget = dragOverColumn === status

            return (
              <div key={status}
                onDragOver={e => handleDragOver(e, status)}
                onDrop={e => handleDrop(e, status)}
                onDragLeave={() => setDragOverColumn(null)}
                style={{
                  backgroundColor: isDragTarget ? statusColors[status] + '10' : colors.kanbanCol,
                  borderRadius: '14px',
                  border: `2px solid ${isDragTarget ? statusColors[status] : 'transparent'}`,
                  padding: '14px',
                  minHeight: '200px',
                  transition: 'all 0.15s',
                }}
              >
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColors[status] }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: colors.text }}>
                      {statusLabels[status]}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px',
                    backgroundColor: statusColors[status] + '20', color: statusColors[status]
                  }}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                {columnTasks.length === 0 ? (
                  <div style={{
                    padding: '24px 12px', textAlign: 'center', borderRadius: '10px',
                    border: `2px dashed ${isDragTarget ? statusColors[status] : colors.border}`,
                    color: colors.textMuted, fontSize: '12px',
                    transition: 'all 0.15s'
                  }}>
                    {isDragTarget ? '📥 Drop here' : 'No tasks'}
                  </div>
                ) : (
                  columnTasks.map((task: any) => <TaskCard key={task.id} task={task} kanban />)
                )}

                {/* Quick add button */}
                <button onClick={() => { setTaskForm({ ...taskForm, status } as any); setShowTaskModal(true) }} style={{
                  display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                  width: '100%', padding: '8px', borderRadius: '9px', border: 'none',
                  backgroundColor: 'transparent', color: colors.textMuted,
                  fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                  transition: 'all 0.15s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.card; e.currentTarget.style.color = colors.text }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.textMuted }}
                >
                  <Plus size={13} /> Add task
                </button>
              </div>
            )
          })}
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
                  placeholder="Task title" style={inputStyle} autoFocus />
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
                    <option key={m.user.id} value={m.user.id}>{m.user.firstName} {m.user.lastName}</option>
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