import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Folder, Trash2, Edit2, X, Check, LayoutGrid, Kanban, GripVertical } from 'lucide-react'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCorners
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../lib/axios'
import { useThemeStore } from '../store/themeStore'
import { ProjectCardSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'


interface Project {
  id: string
  name: string
  description?: string
  color: string
  status: string
  deadline?: string
  createdAt: string
  _count?: { tasks: number }
  tasks?: Task[]
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  projectId?: string
  project?: { id: string; name: string; color: string }
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4'
]

const STATUS_OPTIONS = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']

const statusStyle: Record<string, { bg: string; text: string }> = {
  ACTIVE:    { bg: 'rgba(34,197,94,0.1)',   text: '#4ade80' },
  ON_HOLD:   { bg: 'rgba(234,179,8,0.1)',   text: '#facc15' },
  COMPLETED: { bg: 'rgba(99,102,241,0.1)',  text: '#818cf8' },
  ARCHIVED:  { bg: 'rgba(107,114,128,0.1)', text: '#9ca3af' },
}

const KANBAN_COLUMNS = [
  { id: 'TODO',        label: 'To Do',       color: '#64748b' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#60a5fa' },
  { id: 'IN_REVIEW',   label: 'In Review',   color: '#a78bfa' },
  { id: 'DONE',        label: 'Done',        color: '#4ade80' },
]

const priorityColors: Record<string, { bg: string; color: string }> = {
  URGENT: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  HIGH:   { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  MEDIUM: { bg: 'rgba(234,179,8,0.15)',   color: '#facc15' },
  LOW:    { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
}

// Sortable Task Card for Kanban
function SortableTaskCard({ task, colors }: { task: Task; colors: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const pc = priorityColors[task.priority] || priorityColors.MEDIUM

  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
      backgroundColor: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: '10px',
      padding: '12px',
      cursor: 'grab',
      userSelect: 'none' as const,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div {...attributes} {...listeners} style={{
          color: colors.textMuted, marginTop: '2px', flexShrink: 0,
          cursor: 'grab', display: 'flex', alignItems: 'center'
        }}>
          <GripVertical size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '13px', fontWeight: '500', color: colors.text,
            margin: '0 0 8px', lineHeight: '1.4'
          }}>
            {task.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '10px', padding: '2px 6px', borderRadius: '999px',
              backgroundColor: pc.bg, color: pc.color, fontWeight: '600'
            }}>
              {task.priority}
            </span>
            {task.project && (
              <span style={{ fontSize: '10px', color: task.project.color, fontWeight: '500' }}>
                ● {task.project.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Kanban Column
function KanbanColumn({ column, tasks, colors }: { column: any; tasks: Task[]; colors: any }) {
  return (
    <div style={{
      flex: 1, minWidth: '220px',
      backgroundColor: colors.subBg,
      borderRadius: '14px',
      border: `1px solid ${colors.border}`,
      padding: '14px',
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      {/* Column Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: column.color }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{column.label}</span>
        </div>
        <span style={{
          fontSize: '11px', backgroundColor: colors.card, color: colors.textMuted,
          borderRadius: '999px', padding: '1px 8px', fontWeight: '500',
          border: `1px solid ${colors.border}`
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '80px' }}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} colors={colors} />
          ))}
          {tasks.length === 0 && (
            <div style={{
              border: `2px dashed ${colors.border}`, borderRadius: '10px',
              padding: '24px 12px', textAlign: 'center',
              color: colors.textMuted, fontSize: '12px'
            }}>
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const { isDark } = useThemeStore()
  const [view, setView] = useState<'grid' | 'kanban'>('grid')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', status: 'ACTIVE', deadline: '' })

  const colors = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    input: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    subBg: isDark ? '#0d1829' : '#f8fafc',
    modalBg: isDark ? '#0f172a' : '#ffffff',
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data)
  })

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      closeModal()
      toast.success('Project created!')
    },
    onError: () => toast.error('Failed to create project')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      closeModal()
      toast.success('Project updated!')
    },
    onError: () => toast.error('Failed to update project')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deleted')
    },
    onError: () => toast.error('Failed to delete project')
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/tasks/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  })

  const openCreate = () => {
    setEditProject(null)
    setForm({ name: '', description: '', color: '#6366f1', status: 'ACTIVE', deadline: '' })
    setShowModal(true)
  }

  const openEdit = (p: Project) => {
    setEditProject(p)
    setForm({
      name: p.name, description: p.description || '',
      color: p.color, status: p.status,
      deadline: p.deadline ? p.deadline.split('T')[0] : ''
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditProject(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, deadline: form.deadline || undefined }
    if (editProject) updateMutation.mutate({ id: editProject.id, data: payload })
    else createMutation.mutate(payload)
  }

  const getProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) return 0
    const done = project.tasks.filter(t => t.status === 'DONE').length
    return Math.round((done / project.tasks.length) * 100)
  }

  // Kanban: filter tasks by selected project
  const kanbanTasks = selectedProject
    ? allTasks.filter(t => t.projectId === selectedProject)
    : allTasks

  const getColumnTasks = (status: string) => kanbanTasks.filter(t => t.status === status)

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Check if dropped over a column id
    const column = KANBAN_COLUMNS.find(c => c.id === overId)
    if (column) {
      updateTaskMutation.mutate({ id: taskId, data: { status: column.id } })
      return
    }

    // Dropped over another task — find that task's column
    const overTask = allTasks.find(t => t.id === overId)
    if (overTask && overTask.status !== activeTask?.status) {
      updateTaskMutation.mutate({ id: taskId, data: { status: overTask.status } })
    }
  }

  const inputStyle = {
    width: '100%', backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px', color: colors.text,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: colors.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: 0 }}>Projects</h1>
          <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{
            display: 'flex', backgroundColor: colors.card,
            border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '3px'
          }}>
            {[
              { id: 'grid',   icon: LayoutGrid },
              { id: 'kanban', icon: Kanban },
            ].map(({ id, icon: Icon }) => (
              <button key={id} onClick={() => setView(id as any)} style={{
                padding: '6px 12px', borderRadius: '7px', border: 'none',
                backgroundColor: view === id ? '#6366f1' : 'transparent',
                color: view === id ? '#ffffff' : colors.textMuted,
                cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s'
              }}>
                <Icon size={15} />
              </button>
            ))}
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
      </div>

      {/* Grid View */}
      {view === 'grid' && (
        <>
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {[...Array(4)].map((_, i) => <ProjectCardSkeleton key={i} />)}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '80px' }}>
              <Folder size={48} color={colors.border} style={{ margin: '0 auto 16px' }} />
              <p style={{ color: colors.textMuted, fontSize: '16px' }}>No projects yet</p>
              <p style={{ color: colors.textMuted, fontSize: '14px', marginTop: '4px' }}>Create your first project to get started</p>
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
                    backgroundColor: colors.card, borderRadius: '16px',
                    border: `1px solid ${colors.border}`, padding: '24px'
                  }}>
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
                          <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: 0 }}>{project.name}</h3>
                          <span style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                            backgroundColor: s.bg, color: s.text, fontWeight: '500',
                            marginTop: '4px', display: 'inline-block'
                          }}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEdit(project)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: colors.textMuted, padding: '4px', borderRadius: '6px'
                        }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => {
                          toast((t) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '14px' }}>Delete this project?</span>
                              <button onClick={() => { deleteMutation.mutate(project.id); toast.dismiss(t.id) }} style={{
                                backgroundColor: '#ef4444', border: 'none', borderRadius: '6px',
                                padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '13px'
                              }}>Delete</button>
                              <button onClick={() => toast.dismiss(t.id)} style={{
                                backgroundColor: '#334155', border: 'none', borderRadius: '6px',
                                padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '13px'
                              }}>Cancel</button>
                            </div>
                          ), { duration: 5000 })
                        }} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: colors.textMuted, padding: '4px', borderRadius: '6px'
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {project.description && (
                      <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
                        {project.description}
                      </p>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: colors.textMuted }}>{doneCount}/{taskCount} tasks</span>
                        <span style={{ fontSize: '12px', color: colors.textMuted }}>{progress}%</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: colors.subBg, borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${progress}%`,
                          backgroundColor: project.color, borderRadius: '999px', transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>

                    {project.deadline && (
                      <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                        📅 Due {new Date(project.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div>
          {/* Project Filter */}
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              style={{
                backgroundColor: colors.card, border: `1px solid ${colors.border}`,
                borderRadius: '10px', padding: '9px 14px', color: colors.text,
                fontSize: '13px', outline: 'none', cursor: 'pointer', fontWeight: '500'
              }}
            >
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px' }}>
              {KANBAN_COLUMNS.map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={getColumnTasks(column.id)}
                  colors={colors}
                />
              ))}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask && (
                <div style={{
                  backgroundColor: colors.card, border: `1px solid #6366f1`,
                  borderRadius: '10px', padding: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                  cursor: 'grabbing', minWidth: '200px'
                }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: colors.text, margin: 0 }}>
                    {activeTask.title}
                  </p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
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
            backgroundColor: colors.modalBg, borderRadius: '20px',
            border: `1px solid ${colors.border}`, padding: '32px',
            width: '100%', maxWidth: '480px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>
                {editProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Project Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Website Redesign" required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this project about?" rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                      width: '28px', height: '28px', borderRadius: '50%', backgroundColor: c,
                      border: form.color === c ? '2px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {form.color === c && <Check size={12} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                    style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                  color: colors.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}>Cancel</button>
                <button type="submit" style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: '#6366f1', border: 'none', color: '#ffffff',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '600'
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