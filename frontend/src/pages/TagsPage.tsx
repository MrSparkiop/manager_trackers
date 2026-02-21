import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { Plus, Tag, Edit2, Trash2, X, Check } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'

interface Tag {
  id: string
  name: string
  color: string
  _count: { tasks: number }
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#f43f5e',
]

export default function TagsPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTag, setEditTag]     = useState<Tag | null>(null)
  const [form, setForm]           = useState({ name: '', color: '#6366f1' })

  const colors = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    input: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    subBg: isDark ? '#1e293b' : '#f8fafc',
  }

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      closeModal()
      toast.success('Tag created!')
    },
    onError: () => toast.error('Failed to create tag'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      closeModal()
      toast.success('Tag updated!')
    },
    onError: () => toast.error('Failed to update tag'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('Tag deleted')
    },
    onError: () => toast.error('Failed to delete tag'),
  })

  const openCreate = () => {
    setEditTag(null)
    setForm({ name: '', color: '#6366f1' })
    setShowModal(true)
  }

  const openEdit = (tag: Tag) => {
    setEditTag(tag)
    setForm({ name: tag.name, color: tag.color })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditTag(null) }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editTag) updateMutation.mutate({ id: editTag.id, data: form })
    else createMutation.mutate(form)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px', color: colors.text,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      padding: isMobile ? '16px' : '32px',
      fontFamily: 'Inter, sans-serif',
      minHeight: '100vh',
      backgroundColor: colors.bg,
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '28px', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.text, margin: 0 }}>Tags</h1>
          <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
            {tags.length} tag{tags.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          backgroundColor: '#6366f1', color: '#ffffff', border: 'none',
          borderRadius: '10px', padding: '10px 18px', fontSize: '14px',
          fontWeight: '600', cursor: 'pointer'
        }}>
          <Plus size={16} /> New Tag
        </button>
      </div>

      {/* Tags Grid */}
      {isLoading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px'
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              height: '80px', backgroundColor: colors.card,
              borderRadius: '14px', border: `1px solid ${colors.border}`,
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <div style={{
            width: '64px', height: '64px', backgroundColor: 'rgba(99,102,241,0.1)',
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Tag size={28} color="#6366f1" />
          </div>
          <p style={{ color: colors.text, fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>
            No tags yet
          </p>
          <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 24px' }}>
            Create tags to organize and filter your tasks
          </p>
          <button onClick={openCreate} style={{
            backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '10px', padding: '10px 20px', color: '#818cf8',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>
            + Create your first tag
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px'
        }}>
          {tags.map(tag => (
            <div key={tag.id} style={{
              backgroundColor: colors.card, borderRadius: '14px',
              border: `1px solid ${colors.border}`,
              padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: '14px',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = tag.color + '60')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}
            >
              {/* Color dot */}
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                backgroundColor: tag.color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Tag size={18} color={tag.color} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>
                    {tag.name}
                  </span>
                  <span style={{
                    fontSize: '11px', padding: '1px 7px', borderRadius: '999px',
                    backgroundColor: tag.color + '20', color: tag.color, fontWeight: '600'
                  }}>
                    {tag._count.tasks} task{tag._count.tasks !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{
                  width: '100%', height: '4px', backgroundColor: colors.subBg,
                  borderRadius: '999px', overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%', width: `${Math.min((tag._count.tasks / Math.max(...tags.map(t => t._count.tasks), 1)) * 100, 100)}%`,
                    backgroundColor: tag.color, borderRadius: '999px',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => openEdit(tag)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: colors.textMuted, padding: '6px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center',
                  backgroundColor: 'transparent'
                }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.subBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Edit2 size={14} />
                </button>
                <button onClick={() => {
                  toast((t) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px' }}>Delete "{tag.name}"?</span>
                      <button onClick={() => { deleteMutation.mutate(tag.id); toast.dismiss(t.id) }} style={{
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
                  color: colors.textMuted, padding: '6px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center',
                  backgroundColor: 'transparent'
                }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
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
            backgroundColor: colors.card, borderRadius: '20px',
            border: `1px solid ${colors.border}`, padding: '32px',
            width: '100%', maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>
                {editTag ? 'Edit Tag' : 'New Tag'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>
                  Tag Name *
                </label>
                <input
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Frontend, Bug, Design..."
                  required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = colors.inputBorder}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '10px' }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                      width: '30px', height: '30px', borderRadius: '50%', backgroundColor: c,
                      border: form.color === c ? '3px solid #ffffff' : '3px solid transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                      transition: 'all 0.15s'
                    }}>
                      {form.color === c && <Check size={12} color="#fff" />}
                    </button>
                  ))}
                </div>

                {/* Preview */}
                <div style={{
                  marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
                  backgroundColor: form.color + '15', border: `1px solid ${form.color}30`,
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <Tag size={14} color={form.color} />
                  <span style={{ fontSize: '13px', color: form.color, fontWeight: '600' }}>
                    {form.name || 'Tag preview'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
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
                  {editTag ? 'Save Changes' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}