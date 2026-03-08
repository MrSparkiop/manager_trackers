import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, MessageSquare, Paperclip, Send, Trash2,
  FileText, Image, File, Download, Plus, Activity,
} from 'lucide-react'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

/* ─── types ──────────────────────────────────────────────────────────────── */
interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; firstName: string; lastName: string; email: string }
}

interface ActivityItem {
  id: string
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  actorName: string
  actorEmail: string
  createdAt: string
  actor: { id: string; firstName: string; lastName: string }
}

interface Attachment {
  id: string
  filename: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={16} color="#60a5fa" />
  if (mimeType.includes('pdf')) return <FileText size={16} color="#f87171" />
  return <File size={16} color="#94a3b8" />
}

function actionLabel(item: ActivityItem): string {
  switch (item.action) {
    case 'created': return `created this task`
    case 'status_changed': return `changed status from ${item.oldValue?.replace('_', ' ')} → ${item.newValue?.replace('_', ' ')}`
    case 'priority_changed': return `changed priority from ${item.oldValue} → ${item.newValue}`
    case 'title_changed': return `renamed task`
    case 'dueDate_changed': return `changed due date to ${item.newValue}`
    case 'comment_added': return `added a comment`
    case 'comment_deleted': return `deleted a comment`
    case 'attachment_added': return `attached "${item.newValue}"`
    case 'attachment_deleted': return `removed attachment "${item.oldValue}"`
    case 'assignee_changed': return `changed assignee`
    default: return item.action.replace(/_/g, ' ')
  }
}

function actionColor(action: string): string {
  if (action === 'created') return '#4ade80'
  if (action.includes('status')) return '#60a5fa'
  if (action.includes('priority')) return '#fb923c'
  if (action.includes('comment')) return '#a78bfa'
  if (action.includes('attachment')) return '#facc15'
  return '#64748b'
}

/* ─── rendered comment with @mention highlight ───────────────────────────── */
function CommentContent({ content, colors }: { content: string; colors: any }) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g)
  return (
    <p style={{ fontSize: 13, color: colors.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) => {
        const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/)
        if (match) {
          return (
            <span key={i} style={{
              background: 'rgba(99,102,241,0.15)', color: '#818cf8',
              borderRadius: 4, padding: '0 4px', fontWeight: 600, fontSize: 12,
            }}>@{match[1]}</span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

/* ─── avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const hue = name.charCodeAt(0) * 37 % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 60%, 45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
    }}>
      {initials}
    </div>
  )
}

/* ─── main component ─────────────────────────────────────────────────────── */
interface Props {
  taskId: string | null
  taskTitle: string
  isDark: boolean
  onClose: () => void
}

export default function TaskDetailDrawer({ taskId, taskTitle, isDark, onClose }: Props) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'activity' | 'comments' | 'attachments'>('activity')
  const [comment, setComment] = useState('')
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const c = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    muted: isDark ? '#64748b' : '#94a3b8',
    input: isDark ? '#1e293b' : '#f8fafc',
    sub: isDark ? '#0d1117' : '#f8fafc',
  }

  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ['task-activity', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/activity`).then(r => r.data),
    enabled: !!taskId && tab === 'activity',
  })

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['task-comments', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/comments`).then(r => r.data),
    enabled: !!taskId && tab === 'comments',
    refetchInterval: 10000,
  })

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ['task-attachments', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/attachments`).then(r => r.data),
    enabled: !!taskId && tab === 'attachments',
  })

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => api.post(`/tasks/${taskId}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
      setComment('')
      toast.success('Comment added')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
    },
    onError: () => toast.error('Failed to delete comment'),
  })

  const addAttachmentMutation = useMutation({
    mutationFn: (data: any) => api.post(`/tasks/${taskId}/attachments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
      toast.success('File attached')
    },
    onError: () => toast.error('File too large or upload failed'),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] }),
    onError: () => toast.error('Failed to remove attachment'),
  })

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && comment.trim()) {
      e.preventDefault()
      addCommentMutation.mutate(comment.trim())
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX = 5 * 1024 * 1024
    if (file.size > MAX) { toast.error('File must be under 5MB'); return }

    const reader = new FileReader()
    reader.onload = () => {
      addAttachmentMutation.mutate({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        url: reader.result as string,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (!taskId) return null

  const tabs = [
    { id: 'activity',    label: 'Timeline',    icon: Activity,      count: activities.length },
    { id: 'comments',    label: 'Comments',    icon: MessageSquare, count: comments.length },
    { id: 'attachments', label: 'Files',       icon: Paperclip,     count: attachments.length },
  ] as const

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 100, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 100vw)',
        background: c.card, borderLeft: `1px solid ${c.border}`,
        zIndex: 101, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text, margin: 0, lineHeight: 1.4 }}>
              {taskTitle}
            </h2>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: c.muted, padding: 4, flexShrink: 0,
              display: 'flex', alignItems: 'center', borderRadius: 6,
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                backgroundColor: tab === id ? '#6366f1' : 'transparent',
                color: tab === id ? '#fff' : c.muted,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <Icon size={14} />
                {label}
                {count > 0 && (
                  <span style={{
                    background: tab === id ? 'rgba(255,255,255,0.25)' : c.sub,
                    borderRadius: 999, padding: '0 6px', fontSize: 11, fontWeight: 700,
                    color: tab === id ? '#fff' : c.muted,
                  }}>{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* ── TIMELINE ── */}
          {tab === 'activity' && (
            <div>
              {activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: c.muted, fontSize: 13 }}>
                  No activity yet
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 13, top: 4, bottom: 4,
                    width: 2, background: c.border,
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {activities.map((item, idx) => (
                      <div key={item.id} style={{ display: 'flex', gap: 12, paddingBottom: idx < activities.length - 1 ? 20 : 0 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: c.card, border: `2px solid ${actionColor(item.action)}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', zIndex: 1,
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: actionColor(item.action) }} />
                        </div>
                        <div style={{ flex: 1, paddingTop: 4 }}>
                          <p style={{ fontSize: 13, color: c.text, margin: '0 0 2px' }}>
                            <strong>{item.actorName}</strong>{' '}
                            <span style={{ color: c.muted }}>{actionLabel(item)}</span>
                          </p>
                          <span style={{ fontSize: 11, color: c.muted }}>{timeAgo(item.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── COMMENTS ── */}
          {tab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: c.muted, fontSize: 13 }}>
                  No comments yet. Start the conversation!
                </div>
              ) : (
                comments.map(cmt => (
                  <div key={cmt.id} style={{ display: 'flex', gap: 10 }}>
                    <Avatar name={`${cmt.author.firstName} ${cmt.author.lastName}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                          {cmt.author.firstName} {cmt.author.lastName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: c.muted }}>{timeAgo(cmt.createdAt)}</span>
                          {cmt.author.id === user?.id && (
                            <button
                              onClick={() => deleteCommentMutation.mutate(cmt.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: 2, display: 'flex' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{
                        background: c.sub, borderRadius: 10,
                        padding: '10px 12px', border: `1px solid ${c.border}`,
                      }}>
                        <CommentContent content={cmt.content} colors={{ text: c.text }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── ATTACHMENTS ── */}
          {tab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: c.muted, fontSize: 13 }}>
                  No files attached yet
                </div>
              ) : (
                attachments.map(att => (
                  <div key={att.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: c.sub, border: `1px solid ${c.border}`,
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    {fileIcon(att.mimeType)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: c.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.filename}
                      </p>
                      <p style={{ fontSize: 11, color: c.muted, margin: '2px 0 0' }}>
                        {formatBytes(att.size)} · {timeAgo(att.createdAt)}
                      </p>
                    </div>
                    <a href={att.url} download={att.filename} style={{ color: c.muted, display: 'flex', alignItems: 'center' }}>
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => deleteAttachmentMutation.mutate(att.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: 2, display: 'flex' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 20px', borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>

          {tab === 'comments' && (
            <div>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                background: c.input, border: `1px solid ${c.border}`,
                borderRadius: 12, padding: '8px 12px',
              }}>
                <Avatar name={`${user?.firstName} ${user?.lastName}`} size={24} />
                <textarea
                  ref={commentRef}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  placeholder="Write a comment... (Ctrl+Enter to send)"
                  rows={2}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: c.text, fontSize: 13, resize: 'none', lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={() => { if (comment.trim()) addCommentMutation.mutate(comment.trim()) }}
                  disabled={!comment.trim() || addCommentMutation.isPending}
                  style={{
                    background: comment.trim() ? '#6366f1' : c.border,
                    border: 'none', borderRadius: 8, padding: '6px 10px',
                    cursor: comment.trim() ? 'pointer' : 'default',
                    color: '#fff', display: 'flex', alignItems: 'center',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
              <p style={{ fontSize: 11, color: c.muted, margin: '6px 0 0', paddingLeft: 4 }}>
                Ctrl+Enter to send
              </p>
            </div>
          )}

          {tab === 'attachments' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={addAttachmentMutation.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 16px', borderRadius: 10,
                  background: 'transparent', border: `2px dashed ${c.border}`,
                  color: c.muted, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  justifyContent: 'center', transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = c.border)}
              >
                <Plus size={15} />
                {addAttachmentMutation.isPending ? 'Uploading...' : 'Attach a file (max 5MB)'}
              </button>
            </>
          )}

          {tab === 'activity' && (
            <p style={{ fontSize: 12, color: c.muted, textAlign: 'center', margin: 0 }}>
              Every change to this task is tracked here automatically.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
