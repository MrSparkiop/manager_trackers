import { useState } from 'react'
import {
  Plus, X, CheckCircle2, Circle, Clock, Trash2, Edit2, Play,
  ChevronDown, ChevronRight, Square, CheckSquare2
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RecurrenceBadge } from './RecurrenceSelector'
import toast from 'react-hot-toast'
import type { Task } from '../types'
import { priorityColors, formatDurationShort } from '../lib/constants'

interface SortableTaskRowProps {
  task: Task
  colors: Record<string, string>
  selected: boolean
  isDark: boolean
  running: { taskId: string } | null
  onSelect: (id: string) => void
  onToggleDone: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onAddSubtask: (parentId: string, title: string) => void
  onStartTimer: (task: Task) => void
  onStopTimer: () => void
  onOpenDrawer: (task: Task) => void
}

export default function SortableTaskRow({
  task, colors, selected, onSelect, onToggleDone, onEdit, onDelete, onAddSubtask, isDark,
  running, onStartTimer, onStopTimer, onOpenDrawer
}: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const [expanded, setExpanded] = useState(false)
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const pc = priorityColors[task.priority] || priorityColors.MEDIUM
  const isDone = task.status === 'DONE'
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  const totalLoggedSeconds = (task.timeEntries || []).reduce((sum: number, e: { duration?: number }) => sum + (e.duration || 0), 0)
  const estimatedSeconds = (task.estimatedTime || 0) * 60
  const isTimerRunning = running?.taskId === task.id
  const progress = estimatedSeconds > 0 ? Math.min(totalLoggedSeconds / estimatedSeconds * 100, 100) : 0
  const isOverBudget = estimatedSeconds > 0 && totalLoggedSeconds > estimatedSeconds

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
          <p
            onClick={() => onOpenDrawer(task)}
            title="Click to view activity, comments & files"
            style={{
              fontSize: '14px', fontWeight: '500', color: colors.text, margin: 0,
              textDecoration: isDone ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {task.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
            {task.project && (
              <span style={{ fontSize: '11px', color: task.project.color, fontWeight: '500' }}>
                ● {task.project.name}
              </span>
            )}
            {task.dueDate && (
              <span style={{
                fontSize: '11px',
                color: task.recurrence && task.recurrence !== 'NONE'
                  ? '#818cf8'
                  : colors.textMuted
              }}>
                {task.recurrence && task.recurrence !== 'NONE' ? '🔁 Next: ' : '📅 '}
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.recurrence && task.recurrence !== 'NONE' && (
              <RecurrenceBadge recurrence={task.recurrence} isDark={isDark} />
            )}
            {task.tags && task.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {task.tags.map((tag: { id: string; name: string; color: string }) => (
                  <span key={tag.id} style={{
                    fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                    backgroundColor: tag.color + '20', color: tag.color, fontWeight: '600'
                  }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            {hasSubtasks && (
              <span style={{ fontSize: '11px', color: colors.textMuted }}>
                📋 {task.subtasks.filter((s: Task) => s.status === 'DONE').length}/{task.subtasks.length} subtasks
              </span>
            )}
            {(totalLoggedSeconds > 0 || task.estimatedTime) && (
              <span style={{
                fontSize: '11px', color: isOverBudget ? '#f87171' : colors.textMuted,
                display: 'flex', alignItems: 'center', gap: '3px'
              }}>
                <Clock size={10} />
                {formatDurationShort(totalLoggedSeconds)}
                {task.estimatedTime ? ` / ${formatDurationShort(estimatedSeconds)}` : ''}
              </span>
            )}
            {isTimerRunning && (
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>
                ● recording
              </span>
            )}
          </div>
          {task.estimatedTime != null && totalLoggedSeconds > 0 && (
            <div style={{
              marginTop: '5px', height: '3px',
              backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
              borderRadius: '999px', overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                backgroundColor: isOverBudget ? '#ef4444' : isTimerRunning ? '#f59e0b' : '#6366f1',
                borderRadius: '999px', transition: 'width 0.5s ease'
              }} />
            </div>
          )}
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
          {!isDone && (
            <button
              onClick={() => isTimerRunning ? onStopTimer() : onStartTimer(task)}
              title={isTimerRunning ? 'Stop timer' : 'Start timer for this task'}
              style={{
                background: isTimerRunning ? 'rgba(239,68,68,0.1)' : 'none',
                border: 'none', cursor: 'pointer',
                color: isTimerRunning ? '#ef4444' : colors.textMuted,
                padding: '4px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', transition: 'all 0.15s'
              }}
            >
              {isTimerRunning ? <Square size={13} fill="#ef4444" color="#ef4444" /> : <Play size={13} />}
            </button>
          )}
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
          <button onClick={() => {
            toast((t) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px' }}>Delete this task?</span>
                <button onClick={() => { onDelete(task.id); toast.dismiss(t.id) }} style={{
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
