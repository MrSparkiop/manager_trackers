import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, CheckCircle2, Circle, Clock, Trash2, Edit2,
  ChevronDown, ChevronRight, Search, Square, CheckSquare2
} from 'lucide-react'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCorners
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  parentId?: string
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

// Sortable Task Row
function SortableTaskRow({
  task, colors, selected, onSelect, onToggleDone, onEdit, onDelete, onAddSubtask, isDark
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const [expanded, setExpanded] = useState(false)
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const pc = priorityColors[task.priority] || priorityColors.MEDIUM
  const isDone = task.status === 'DONE'
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        backgroundColor: selected ? (isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)') : colors.card,
        border: selected ? '1px solid rgba(99,102,241,0.3)' : `1px solid ${colors.border}`,
        borderRadius: '12px', padding: '12px 14px', opacity: isDone ? 0.65 : 1,
        transition: 'all 0.15s'
      }}>
        {/* Drag handle */}
        <div {...attributes} {...listeners} style={{
          cursor: 'grab', color: colors.textMuted, flexShrink: 0,
          display: 'flex', alignItems: 'center', padding: '0 2px'
        }}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" opacity={0.4}>
            <circle cx="2" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
            <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
            <circle cx="2" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
          </svg>
        </div>

        {/* Bulk select */}
        <button onClick={() => onSelect(task.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: selected ? '#6366f1' : colors.textMuted, padding: 0, flexShrink: 0,
          display: 'flex', alignItems: 'center'
        }}>
          {selected ? <CheckSquare2 size={16} /> : <Square size={16} />}
        </button>

        {/* Done toggle */}
        <button onClick={() => onToggleDone(task)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: isDone ? '#4ade80' : colors.textMuted, padding: 0, flexShrink: 0,
          display: 'flex', alignItems: 'center'
        }}>
          {isDone ? <CheckCircle2 size={17} /> : <Circle size={17} />}
        </button>

        {/* Expand subtasks */}
        {hasSubtasks && (
          <button onClick={() => setExpanded(!expanded)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.textMuted, padding: 0, flexShrink: 0,
            display: 'flex', alignItems: 'center'
          }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '14px', fontWeight: '500', color: colors.text, margin: 0,
            textDecoration: isDone ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {task.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
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
            {hasSubtasks && (
              <span style={{ fontSize: '11px', color: colors.textMuted }}>
                📋 {task.subtasks.filter((s: Task) => s.status === 'DONE').length}/{task.subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        {/* Priority */}
        <span style={{
          fontSize: '11px', padding: '2px 7px', borderRadius: '999px',
          backgroundColor: pc.bg, color: pc.color, fontWeight: '600', flexShrink: 0
        }}>
          {task.priority}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <button onClick={() => setShowSubtaskInput(!showSubtaskInput)} title="Add subtask" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.textMuted, padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center'
          }}>
            <Plus size={13} />
          </button>
          <button onClick={() => onEdit(task)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.textMuted, padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center'
          }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(task.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.textMuted, padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center'
          }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Inline subtask input */}
      {showSubtaskInput && (
        <div style={{ marginLeft: '32px', marginTop: '4px', display: 'flex', gap: '8px' }}>
          <input
            autoFocus
            value={subtaskTitle}
            onChange={e => setSubtaskTitle(e.target.value)}
            placeholder="Add subtask..."
            onKeyDown={e => {
              if (e.key === 'Enter' && subtaskTitle.trim()) {
                onAddSubtask(task.id, subtaskTitle.trim())
                setSubtaskTitle('')
                setShowSubtaskInput(false)
                setExpanded(true)
              }
              if (e.key === 'Escape') setShowSubtaskInput(false)
            }}
            style={{
              flex: 1, backgroundColor: colors.input, border: `1px solid #6366f1`,
              borderRadius: '8px', padding: '7px 12px', color: colors.text,
              fontSize: '13px', outline: 'none'
            }}
          />
          <button onClick={() => {
            if (subtaskTitle.trim()) {
              onAddSubtask(task.id, subtaskTitle.trim())
              setSubtaskTitle('')
              setShowSubtaskInput(false)
              setExpanded(true)
            }
          }} style={{
            backgroundColor: '#6366f1', border: 'none', borderRadius: '8px',
            padding: '7px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px'
          }}>
            Add
          </button>
          <button onClick={() => setShowSubtaskInput(false)} style={{
            background: 'none', border: `1px solid ${colors.border}`, borderRadius: '8px',
            padding: '7px 10px', color: colors.textMuted, cursor: 'pointer'
          }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div style={{ marginLeft: '32px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {task.subtasks.map((sub: Task) => {
            const subDone = sub.status === 'DONE'
            return (
              <div key={sub.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                backgroundColor: colors.subBg, border: `1px solid ${colors.border}`,
                borderRadius: '9px', padding: '9px 12px'
              }}>
                <button onClick={() => onToggleDone(sub)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: subDone ? '#4ade80' : colors.textMuted, padding: 0, flexShrink: 0,
                  display: 'flex', alignItems: 'center'
                }}>
                  {subDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                </button>
                <p style={{
                  fontSize: '13px', color: colors.text, margin: 0, flex: 1,
                  textDecoration: subDone ? 'line-through' : 'none', opacity: subDone ? 0.6 : 1
                }}>
                  {sub.title}
                </p>
                <button onClick={() => onDelete(sub.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: colors.textMuted, padding: '2px', display: 'flex', alignItems: 'center'
                }}>
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const { isDark } = useThemeStore()
  const [showModal, setShowModal]           = useState(false)
  const [editTask, setEditTask]             = useState<Task | null>(null)
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterProject, setFilterProject]   = useState('')
  const [search, setSearch]                 = useState('')
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [activeTask, setActiveTask]         = useState<Task | null>(null)
  const [quickTitle, setQuickTitle]         = useState('')
  const quickInputRef = useRef<HTMLInputElement>(null)
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
    subBg: isDark ? '#0d1117' : '#f1f5f9',
    modalBg: isDark ? '#0f172a' : '#ffffff',
    filterBg: isDark ? '#0f172a' : '#ffffff',
    searchBg: isDark ? '#0f172a' : '#ffffff',
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      // Only close modal if it was a form submit, not a drag
      if (variables.closeModal) closeModal()
    }
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
      title: t.title, description: t.description || '',
      status: t.status, priority: t.priority,
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
      title: form.title, description: form.description || undefined,
      status: form.status, priority: form.priority,
      dueDate: form.dueDate || undefined,
      estimatedTime: form.estimatedTime ? parseInt(form.estimatedTime) : undefined,
      projectId: form.projectId || undefined,
    }
    if (editTask) updateMutation.mutate({ id: editTask.id, data: payload, closeModal: true })
    else createMutation.mutate(payload)
  }

  const toggleDone = (task: Task) => {
    updateMutation.mutate({ id: task.id, data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' } })
  }

  const handleAddSubtask = (parentId: string, title: string) => {
    createMutation.mutate({ title, status: 'TODO', priority: 'MEDIUM', parentId })
  }

  // Quick add
  const handleQuickAdd = () => {
    if (!quickTitle.trim()) return
    createMutation.mutate({ title: quickTitle.trim(), status: 'TODO', priority: 'MEDIUM' })
    setQuickTitle('')
    quickInputRef.current?.focus()
  }

  // Bulk select
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filteredTasks.length) setSelected(new Set())
    else setSelected(new Set(filteredTasks.map(t => t.id)))
  }

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} tasks?`)) return
    await Promise.all([...selected].map(id => api.delete(`/tasks/${id}`)))
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    setSelected(new Set())
  }

  // Drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedTask = tasks.find(t => t.id === active.id)
    const overTask = tasks.find(t => t.id === over.id)

    if (!draggedTask || !overTask) return

    // If dropped on a task with different status → move to that status
    if (draggedTask.status !== overTask.status) {
      updateMutation.mutate({ id: draggedTask.id, data: { status: overTask.status } })
    }
  }

  // Filter & search
  const filteredTasks = tasks.filter(t => {
    if (!t.parentId) {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }
    return false // subtasks shown inside parent
  })

  // Group by status
  const grouped: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], CANCELLED: [] }
  filteredTasks.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t) })

  const inputStyle = {
    width: '100%', backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px', color: colors.text,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const
  }

  const labelStyle = { display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: colors.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: 0 }}>Tasks</h1>
          <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>{filteredTasks.length} tasks</p>
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

      {/* Quick Add */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '16px',
        backgroundColor: colors.card, border: `1px solid ${colors.border}`,
        borderRadius: '12px', padding: '8px'
      }}>
        <input
          ref={quickInputRef}
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          placeholder="⚡ Quick add task... (press Enter)"
          onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
          style={{
            flex: 1, background: 'none', border: 'none',
            color: colors.text, fontSize: '14px', outline: 'none',
            padding: '4px 8px'
          }}
        />
        {quickTitle && (
          <button onClick={handleQuickAdd} style={{
            backgroundColor: '#6366f1', border: 'none', borderRadius: '8px',
            padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}>
            Add
          </button>
        )}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: colors.searchBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '7px 12px', flex: 1, minWidth: '180px'
        }}>
          <Search size={14} color={colors.textMuted} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{ background: 'none', border: 'none', color: colors.text, fontSize: '13px', outline: 'none', width: '100%' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 0, display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>

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

        {(filterStatus || filterPriority || filterProject || search) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterProject(''); setSearch('') }} style={{
            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '8px 12px', color: '#f87171', fontSize: '13px', cursor: 'pointer'
          }}>
            Clear
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '10px', padding: '10px 16px', marginBottom: '16px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#818cf8' }}>
            {selected.size} task{selected.size > 1 ? 's' : ''} selected
          </span>
          <button onClick={selectAll} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#818cf8', fontSize: '13px', fontWeight: '500'
          }}>
            {selected.size === filteredTasks.length ? 'Deselect all' : 'Select all'}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={bulkDelete} style={{
            backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '6px 14px', color: '#f87171',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Trash2 size={13} /> Delete selected
          </button>
          <button onClick={() => setSelected(new Set())} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted
          }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[...Array(5)].map((_, i) => <TaskRowSkeleton key={i} />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <CheckCircle2 size={48} color={colors.border} style={{ margin: '0 auto 16px' }} />
          <p style={{ color: colors.textMuted, fontSize: '16px' }}>
            {search ? 'No tasks match your search' : 'No tasks yet'}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(grouped).map(([status, statusTasks]) => {
              if (statusTasks.length === 0) return null
              const cfg = statusConfig[status]
              const Icon = cfg.icon
              return (
                <div key={status}>
                  {/* Group header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Icon size={14} color={cfg.color} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: cfg.color }}>{cfg.label}</span>
                    <span style={{
                      fontSize: '11px', backgroundColor: colors.subBg, color: colors.textMuted,
                      borderRadius: '999px', padding: '1px 8px', fontWeight: '500',
                      border: `1px solid ${colors.border}`
                    }}>{statusTasks.length}</span>
                  </div>

                  <SortableContext items={statusTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {statusTasks.map(task => (
                        <SortableTaskRow
                          key={task.id}
                          task={task}
                          colors={colors}
                          selected={selected.has(task.id)}
                          isDark={isDark}
                          onSelect={toggleSelect}
                          onToggleDone={toggleDone}
                          onEdit={openEdit}
                          onDelete={(id: string) => { if (confirm('Delete?')) deleteMutation.mutate(id) }}
                          onAddSubtask={handleAddSubtask}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div style={{
                backgroundColor: colors.card, border: '1px solid #6366f1',
                borderRadius: '12px', padding: '12px 14px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)', cursor: 'grabbing'
              }}>
                <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text, margin: 0 }}>
                  {activeTask.title}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
                }}>Cancel</button>
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