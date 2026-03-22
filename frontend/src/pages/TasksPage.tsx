import { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, X, CheckCircle2, Circle, Clock, Trash2, Edit2, Play,
  ChevronDown, ChevronRight, Search, Square, CheckSquare2, Check, CheckSquare, RefreshCw
} from 'lucide-react'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCorners
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import api from '../lib/axios'
import { useThemeStore } from '../store/themeStore'
import { useIsMobile } from '../lib/useIsMobile'
import { TaskRowSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import RecurrenceSelector, { RecurrenceBadge } from '../components/RecurrenceSelector'
import RecurringTaskModal from '../components/RecurringTaskModal'
import TaskDetailDrawer from '../components/TaskDetailDrawer'
import SortableTaskRow from '../components/SortableTaskRow'
import toast from 'react-hot-toast'
import type { Task, Project } from '../types'
import { priorityColors, PRIORITIES, STATUSES } from '../lib/constants'
import { useColors } from '../lib/useColors'
import { getInputStyle, getLabelStyle } from '../lib/formStyles'

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  TODO:        { color: '#64748b', icon: Circle,       label: 'To Do' },
  IN_PROGRESS: { color: '#60a5fa', icon: Clock,        label: 'In Progress' },
  IN_REVIEW:   { color: '#a78bfa', icon: ChevronDown,  label: 'In Review' },
  DONE:        { color: '#4ade80', icon: CheckCircle2, label: 'Done' },
  CANCELLED:   { color: '#f87171', icon: X,            label: 'Cancelled' },
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function TasksPage() {
  const queryClient = useQueryClient()
  const { isDark } = useThemeStore()
  const isMobile = useIsMobile()
  const [showModal, setShowModal]           = useState(false)
  const [editTask, setEditTask]             = useState<Task | null>(null)
  const [filterStatus, setFilterStatus]       = useState('')
  const [filterPriority, setFilterPriority]   = useState('')
  const [filterProject, setFilterProject]     = useState('')
  const [filterRecurring, setFilterRecurring] = useState(false)
  const [search, setSearch]                   = useState('')
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [activeTask, setActiveTask]         = useState<Task | null>(null)
  const [quickTitle, setQuickTitle]         = useState('')

  // Recurring task confirmation
  const [recurringTask, setRecurringTask]   = useState<Task | null>(null)
  const [drawerTask, setDrawerTask]         = useState<{ id: string; title: string } | null>(null)

  const quickInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '', description: '', status: 'TODO', priority: 'MEDIUM',
    dueDate: '', estimatedTime: '', projectId: '', tagIds: [] as string[],
    recurrence: 'NONE', recurrenceEndDate: '',
  })

  const colors = useColors(isDark)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: running } = useQuery<{ id: string; taskId?: string; startTime: string; task?: any } | null>({
    queryKey: ['time-running'],
    queryFn: () => api.get('/time-tracker/running').then(r => r.data),
    refetchInterval: 10000,
  })

  const startTimerMutation = useMutation({
    mutationFn: async (task: Task) => {
      if (running?.id) {
        await api.post(`/time-tracker/stop/${running.id}`)
      }
      return api.post('/time-tracker/start', {
        startTime: new Date().toISOString(),
        description: task.title,
        taskId: task.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-running'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['time-summary'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Timer started!')
    },
    onError: () => toast.error('Failed to start timer'),
  })

  const stopTimerMutation = useMutation({
    mutationFn: () => api.post(`/time-tracker/stop/${running?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-running'] })
      queryClient.invalidateQueries({ queryKey: ['time-entries'] })
      queryClient.invalidateQueries({ queryKey: ['time-summary'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Timer stopped!')
    },
    onError: () => toast.error('Failed to stop timer'),
  })

  const { data: tasksResponse, isLoading } = useQuery<{ tasks: Task[]; total: number }>({
    queryKey: ['tasks', filterStatus, filterPriority, filterProject],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterStatus)   params.append('status', filterStatus)
      if (filterPriority) params.append('priority', filterPriority)
      if (filterProject)  params.append('projectId', filterProject)
      params.append('limit', '200')
      return api.get(`/tasks?${params}`).then(r => r.data)
    }
  })
  const tasks = tasksResponse?.tasks ?? []

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data)
  })

  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      closeModal()
      toast.success('Task created!')
    },
    onError: () => toast.error('Failed to create task')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/tasks/${id}`, data),
    // Optimistic update: immediately reflect status/priority changes in the UI
    onMutate: async ({ id, data }: any) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'], exact: false })
      const previousSnapshots = queryClient.getQueriesData<{ tasks: Task[]; total: number }>({ queryKey: ['tasks'] })
      queryClient.setQueriesData<{ tasks: Task[]; total: number }>({ queryKey: ['tasks'], exact: false }, (old) =>
        old ? { ...old, tasks: old.tasks.map(t => t.id === id ? { ...t, ...data } : t) } : old
      )
      return { previousSnapshots }
    },
    onSuccess: (_, variables) => {
      if (variables.closeModal) {
        closeModal()
        toast.success('Task updated!')
      }
    },
    onError: (_err, _vars, ctx: any) => {
      // Roll back to the snapshot taken before the optimistic update
      ctx?.previousSnapshots?.forEach(([queryKey, data]: [any, any]) => {
        queryClient.setQueryData(queryKey, data)
      })
      toast.error('Failed to update task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Failed to delete task')
  })

  // Recurring next occurrence mutation
  const nextOccurrenceMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/next-occurrence`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setRecurringTask(null)
      if (res.data.created) toast.success('Next occurrence scheduled! 🔁')
      else toast('Recurrence has ended', { icon: '✅' })
    },
    onError: () => toast.error('Failed to schedule next occurrence')
  })

  const skipOccurrenceMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/skip-occurrence`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setRecurringTask(null)
      if (res.data.created) toast.success('Occurrence skipped, next one scheduled!')
      else toast('Recurrence has ended', { icon: '✅' })
    },
    onError: () => toast.error('Failed to skip occurrence')
  })

  const openCreate = useCallback(() => {
    setEditTask(null)
    setForm({
      title: '', description: '', status: 'TODO', priority: 'MEDIUM',
      dueDate: '', estimatedTime: '', projectId: '', tagIds: [],
      recurrence: 'NONE', recurrenceEndDate: '',
    })
    setShowModal(true)
  }, [])

  const openEdit = useCallback((t: Task) => {
    setEditTask(t)
    setForm({
      title: t.title, description: t.description || '',
      status: t.status, priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      estimatedTime: t.estimatedTime ? String(t.estimatedTime) : '',
      projectId: t.projectId || '',
      tagIds: t.tags?.map((tag: any) => tag.id) || [],
      recurrence: t.recurrence || 'NONE',
      recurrenceEndDate: t.recurrenceEndDate ? t.recurrenceEndDate.split('T')[0] : '',
    })
    setShowModal(true)
  }, [])

  const closeModal = () => { setShowModal(false); setEditTask(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      title: form.title, description: form.description || undefined,
      status: form.status, priority: form.priority,
      dueDate: form.dueDate || undefined,
      estimatedTime: form.estimatedTime ? parseInt(form.estimatedTime) : undefined,
      projectId: form.projectId || undefined,
      tagIds: form.tagIds,
      recurrence: form.recurrence,
      recurrenceEndDate: form.recurrenceEndDate || undefined,
    }
    if (editTask) updateMutation.mutate({ id: editTask.id, data: payload, closeModal: true })
    else createMutation.mutate(payload)
  }

  // Toggle done — show recurring modal if task is recurring
  const toggleDone = useCallback((task: Task) => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
    updateMutation.mutate({ id: task.id, data: { status: newStatus } })

    // If completing a recurring task → show confirmation modal
    if (newStatus === 'DONE' && task.recurrence && task.recurrence !== 'NONE') {
      setTimeout(() => setRecurringTask(task), 400)
    }
  }, [updateMutation])

  const handleAddSubtask = useCallback((parentId: string, title: string) => {
    createMutation.mutate({ title, status: 'TODO', priority: 'MEDIUM', parentId })
  }, [createMutation])

  const handleQuickAdd = useCallback(() => {
    if (!quickTitle.trim()) return
    createMutation.mutate({ title: quickTitle.trim(), status: 'TODO', priority: 'MEDIUM' })
    setQuickTitle('')
    quickInputRef.current?.focus()
  }, [quickTitle, createMutation])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (t.parentId) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRecurring && (!t.recurrence || t.recurrence === 'NONE')) return false
    return true
  }), [tasks, search, filterRecurring])

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], CANCELLED: [] }
    filteredTasks.forEach(t => { if (g[t.status]) g[t.status].push(t) })
    return g
  }, [filteredTasks])

  const selectAll = useCallback(() => {
    if (selected.size === filteredTasks.length) setSelected(new Set())
    else setSelected(new Set(filteredTasks.map(t => t.id)))
  }, [selected.size, filteredTasks])

  const bulkDelete = async () => {
    const toastId = toast.loading(`Deleting ${selected.size} tasks...`)
    try {
      await api.delete('/tasks/bulk', { data: { ids: [...selected] } })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setSelected(new Set())
      toast.success(`${selected.size} tasks deleted`, { id: toastId })
    } catch {
      toast.error('Failed to delete tasks', { id: toastId })
    }
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }, [tasks])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const draggedTask = tasks.find(t => t.id === active.id)
    const overTask    = tasks.find(t => t.id === over.id)
    if (!draggedTask || !overTask) return
    if (draggedTask.status !== overTask.status) {
      updateMutation.mutate({ id: draggedTask.id, data: { status: overTask.status } })
    }
  }, [tasks, updateMutation])

  const inputStyle = getInputStyle(colors)
  const labelStyle = getLabelStyle(colors)

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: colors.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
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
            color: colors.text, fontSize: '14px', outline: 'none', padding: '4px 8px'
          }}
        />
        {quickTitle && (
          <button onClick={handleQuickAdd} style={{
            backgroundColor: '#6366f1', border: 'none', borderRadius: '8px',
            padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}>Add</button>
        )}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: colors.searchBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '7px 12px', flex: 1, minWidth: '180px'
        }}>
          <Search size={14} color={colors.textMuted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
            style={{ background: 'none', border: 'none', color: colors.text, fontSize: '13px', outline: 'none', width: '100%' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 0, display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          backgroundColor: colors.filterBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '8px 12px', color: filterStatus ? colors.text : colors.textMuted,
          fontSize: '13px', outline: 'none', cursor: 'pointer', width: isMobile ? '100%' : 'auto'
        }}>
          <option value="">All Statuses</option>
          {STATUSES.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
          backgroundColor: colors.filterBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '8px 12px', color: filterPriority ? colors.text : colors.textMuted,
          fontSize: '13px', outline: 'none', cursor: 'pointer', width: isMobile ? '100%' : 'auto'
        }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{
          backgroundColor: colors.filterBg, border: `1px solid ${colors.border}`,
          borderRadius: '8px', padding: '8px 12px', color: filterProject ? colors.text : colors.textMuted,
          fontSize: '13px', outline: 'none', cursor: 'pointer', width: isMobile ? '100%' : 'auto'
        }}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <button
          onClick={() => setFilterRecurring(v => !v)}
          title="Show only recurring tasks"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: filterRecurring ? 'rgba(99,102,241,0.15)' : colors.filterBg,
            border: filterRecurring ? '1px solid rgba(99,102,241,0.4)' : `1px solid ${colors.border}`,
            borderRadius: '8px', padding: '8px 12px',
            color: filterRecurring ? '#818cf8' : colors.textMuted,
            fontSize: '13px', cursor: 'pointer', fontWeight: filterRecurring ? '600' : '400',
            transition: 'all 0.15s', whiteSpace: 'nowrap' as const
          }}
        >
          <RefreshCw size={13} />
          Recurring
        </button>

        {(filterStatus || filterPriority || filterProject || filterRecurring || search) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterProject(''); setFilterRecurring(false); setSearch('') }} style={{
            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '8px 12px', color: '#f87171', fontSize: '13px', cursor: 'pointer'
          }}>Clear</button>
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
          <button onClick={selectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: '13px', fontWeight: '500' }}>
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
          <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(6)].map((_, i) => <TaskRowSkeleton key={i} isDark={isDark} />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={filterRecurring ? RefreshCw : CheckSquare}
          title={filterStatus || filterPriority || filterProject || filterRecurring || search ? 'No tasks match your filters' : 'No tasks yet'}
          description={filterRecurring ? 'No recurring tasks found. Create a task and set a recurrence pattern to see it here.' : filterStatus || filterPriority || filterProject || search ? 'Try adjusting your filters or create a new task.' : 'Create your first task to get started tracking your work.'}
          action={{ label: '+ New Task', onClick: () => setShowModal(true) }}
          isDark={isDark}
          color="#6366f1"
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(grouped).map(([status, statusTasks]) => {
              if (statusTasks.length === 0) return null
              const cfg = statusConfig[status]
              const Icon = cfg.icon
              return (
                <div key={status}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Icon size={14} color={cfg.color} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: cfg.color }}>{cfg.label}</span>
                    <span style={{
                      fontSize: '11px', backgroundColor: colors.subBg, color: colors.textMuted,
                      borderRadius: '999px', padding: '1px 8px', fontWeight: '500', border: `1px solid ${colors.border}`
                    }}>{statusTasks.length}</span>
                  </div>
                  <SortableContext items={statusTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {statusTasks.map(task => (
                        <SortableTaskRow
                          key={task.id} task={task} colors={colors}
                          selected={selected.has(task.id)} isDark={isDark}
                          onSelect={toggleSelect} onToggleDone={toggleDone}
                          onEdit={openEdit} onDelete={(id: string) => deleteMutation.mutate(id)}
                          onAddSubtask={handleAddSubtask}
                          running={running}
                          onStartTimer={(t: Task) => startTimerMutation.mutate(t)}
                          onStopTimer={() => stopTimerMutation.mutate()}
                          onOpenDrawer={(t: Task) => setDrawerTask({ id: t.id, title: t.title })}
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

      {/* ── Create/Edit Modal ────────────────────────────────────── */}
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

              {/* 🔁 Recurrence */}
              <RecurrenceSelector
                value={form.recurrence}
                onChange={v => setForm({ ...form, recurrence: v })}
                endDate={form.recurrenceEndDate}
                onEndDateChange={v => setForm({ ...form, recurrenceEndDate: v })}
                isDark={isDark}
              />

              <div>
                <label style={labelStyle}>Tags</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {tags.map((tag: any) => {
                    const isSelected = form.tagIds.includes(tag.id)
                    return (
                      <button key={tag.id} type="button" onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          tagIds: isSelected
                            ? prev.tagIds.filter(id => id !== tag.id)
                            : [...prev.tagIds, tag.id]
                        }))
                      }} style={{
                        padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                        border: `1px solid ${isSelected ? tag.color : colors.inputBorder}`,
                        backgroundColor: isSelected ? tag.color + '20' : 'transparent',
                        color: isSelected ? tag.color : colors.textMuted,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '5px'
                      }}>
                        {isSelected && <Check size={10} />}
                        {tag.name}
                      </button>
                    )
                  })}
                  {tags.length === 0 && (
                    <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                      No tags yet — create some in the Tags page
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
                  color: colors.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}>Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  backgroundColor: '#6366f1', border: 'none',
                  color: '#ffffff', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                  opacity: createMutation.isPending || updateMutation.isPending ? 0.7 : 1
                }}>
                  {editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔁 Recurring Task Confirmation Modal */}
      {recurringTask && (
        <RecurringTaskModal
          task={recurringTask}
          isDark={isDark}
          isLoading={nextOccurrenceMutation.isPending || skipOccurrenceMutation.isPending}
          onConfirm={() => nextOccurrenceMutation.mutate(recurringTask.id)}
          onSkip={() => skipOccurrenceMutation.mutate(recurringTask.id)}
          onDismiss={() => setRecurringTask(null)}
        />
      )}

      {drawerTask && (
        <TaskDetailDrawer
          taskId={drawerTask.id}
          taskTitle={drawerTask.title}
          isDark={isDark}
          onClose={() => setDrawerTask(null)}
        />
      )}
    </div>
  )
}