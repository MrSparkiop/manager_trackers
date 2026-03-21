import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Task } from '../types'
import { priorityColors } from '../lib/constants'
import type { CSSProperties } from 'react'

interface Colors {
  card: string; border: string; text: string; textMuted: string; subBg: string
}

interface KanbanColumnDef {
  id: string; label: string; color: string
}

export function SortableTaskCard({ task, colors }: { task: Task; colors: Colors }) {
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

export function KanbanColumn({ column, tasks, colors }: { column: KanbanColumnDef; tasks: Task[]; colors: Colors }) {
  return (
    <div style={{
      flex: 1, minWidth: '220px',
      backgroundColor: colors.subBg,
      borderRadius: '14px',
      border: `1px solid ${colors.border}`,
      padding: '14px',
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
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
