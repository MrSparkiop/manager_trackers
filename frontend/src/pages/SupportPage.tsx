import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { Plus, X, Send, MessageSquare, Inbox, LifeBuoy, Clock, CheckCircle2, CircleDot, ArrowLeft } from 'lucide-react'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const CATEGORIES = ['general', 'billing', 'bug', 'feature', 'account', 'other']
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

const STATUS = {
  OPEN:        { label: 'Open',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: CircleDot     },
  IN_PROGRESS: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock         },
  RESOLVED:    { label: 'Resolved',    color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle2  },
  CLOSED:      { label: 'Closed',      color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: X             },
} as Record<string, { label: string; color: string; bg: string; icon: any }>

const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#94a3b8', NORMAL: '#60a5fa', HIGH: '#f97316', URGENT: '#ef4444',
}

function ago(d: string) {
  const s = (Date.now() - +new Date(d)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ name, size = 32, staff = false }: { name: string; size?: number; staff?: boolean }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: staff ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em',
    }}>{initials}</div>
  )
}

export default function SupportPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [selected, setSelected] = useState<any>(null)
  const [modal, setModal] = useState(false)
  const [reply, setReply] = useState('')
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'NORMAL' })
  const bottomRef = useRef<HTMLDivElement>(null)

  const dark = isDark
  const surface  = dark ? '#0f172a' : '#ffffff'
  const bg       = dark ? '#020817' : '#f1f5f9'
  const border   = dark ? '#1e293b' : '#e2e8f0'
  const text      = dark ? '#f1f5f9' : '#0f172a'
  const muted    = dark ? '#64748b' : '#94a3b8'
  const subtle   = dark ? '#1e293b' : '#f8fafc'
  const inputBg  = dark ? '#0f172a' : '#ffffff'

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => api.get('/support/tickets').then(r => r.data),
  })

  // Keep selected in sync
  useEffect(() => {
    if (selected) {
      const fresh = tickets.find((t: any) => t.id === selected.id)
      if (fresh) setSelected(fresh)
    }
  }, [tickets])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.replies?.length])

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/support/tickets', d),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] })
      setModal(false)
      setForm({ subject: '', description: '', category: 'general', priority: 'NORMAL' })
      setSelected(r.data)
      toast.success('Ticket submitted!')
    },
    onError: () => toast.error('Failed to submit'),
  })

  const replyMut = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.post(`/support/tickets/${id}/replies`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); setReply('') },
    onError: () => toast.error('Failed to send'),
  })

  const closeMut = useMutation({
    mutationFn: (id: string) => api.put(`/support/tickets/${id}/close`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); toast.success('Ticket closed') },
  })

  const inp = {
    backgroundColor: inputBg,
    border: `1.5px solid ${border}`,
    borderRadius: '10px',
    padding: '10px 14px',
    color: text,
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }

  const userName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  const statusCounts = tickets.reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", backgroundColor: bg, minHeight: '100vh', padding: isMobile ? '16px' : '28px 32px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LifeBuoy size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: text, margin: 0, letterSpacing: '-0.02em' }}>Support</h1>
            <p style={{ fontSize: '13px', color: muted, margin: 0 }}>We're here to help — usually reply within a few hours</p>
          </div>
        </div>
        <button
          onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', letterSpacing: '-0.01em' }}
        >
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* ── Status pills ── */}
      {tickets.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {Object.entries(STATUS).map(([key, cfg]) => {
            const count = statusCounts[key] || 0
            if (!count) return null
            const Icon = cfg.icon
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                <Icon size={12} color={cfg.color} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: cfg.color }}>{count} {cfg.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (selected ? '320px 1fr' : '1fr'), gap: '14px', alignItems: 'start' }}>

        {/* ── Ticket list ── */}
        {(!isMobile || !selected) && <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: '18px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tickets
            </span>
            <span style={{ fontSize: '12px', color: muted }}>{tickets.length} total</span>
          </div>

          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: muted, fontSize: '13px' }}>Loading…</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '16px', backgroundColor: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Inbox size={22} color={muted} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: text, margin: 0 }}>No tickets yet</p>
              <p style={{ fontSize: '13px', color: muted, margin: 0, maxWidth: '200px', lineHeight: 1.5 }}>Submit a ticket whenever you need help from our team</p>
              <button onClick={() => setModal(true)} style={{ marginTop: '4px', padding: '8px 18px', borderRadius: '10px', backgroundColor: '#6366f1', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                New Ticket
              </button>
            </div>
          ) : (
            tickets.map((t: any) => {
              const cfg = STATUS[t.status]
              const Icon = cfg.icon
              const active = selected?.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '14px 18px',
                    border: 'none', borderBottom: `1px solid ${border}`,
                    backgroundColor: active ? (dark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)') : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s',
                    borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                    display: 'block',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
                    <p style={{ fontSize: '13.5px', fontWeight: '600', color: text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {t.subject}
                    </p>
                    <span style={{ fontSize: '11px', color: muted, flexShrink: 0, paddingTop: '2px' }}>{ago(t.updatedAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '600', color: cfg.color }}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: muted, display: 'inline-block' }} />
                    <span style={{ fontSize: '11.5px', color: PRIORITY_COLOR[t.priority], fontWeight: '600' }}>{t.priority}</span>
                    {t._count?.replies > 0 && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: muted, display: 'inline-block' }} />
                        <span style={{ fontSize: '11px', color: muted, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MessageSquare size={10} /> {t._count.replies}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>}

        {/* ── Conversation ── */}
        {selected ? (
          <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: '18px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${border}` }}>
              <button
                onClick={() => setSelected(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '13px', fontWeight: '600', padding: '0 0 14px 0' }}
              >
                <ArrowLeft size={15} /> All Tickets
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: text, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                    {selected.subject}
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(() => {
                      const cfg = STATUS[selected.status]
                      const Icon = cfg.icon
                      return (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '8px', backgroundColor: cfg.bg, color: cfg.color }}>
                          <Icon size={11} />{cfg.label}
                        </span>
                      )
                    })()}
                    <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '8px', backgroundColor: PRIORITY_COLOR[selected.priority] + '18', color: PRIORITY_COLOR[selected.priority] }}>
                      {selected.priority}
                    </span>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', backgroundColor: subtle, color: muted, textTransform: 'capitalize' }}>
                      {selected.category}
                    </span>
                    <span style={{ fontSize: '11.5px', color: muted }}>
                      {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                {selected.status !== 'CLOSED' && (
                  <button
                    onClick={() => closeMut.mutate(selected.id)}
                    style={{ fontSize: '12px', fontWeight: '600', padding: '7px 14px', borderRadius: '9px', backgroundColor: subtle, border: `1px solid ${border}`, color: muted, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '460px', overflowY: 'auto' }}>

              {/* Original */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <Avatar name={userName} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '7px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: text }}>{userName}</span>
                    <span style={{ fontSize: '11px', color: muted }}>{ago(selected.createdAt)}</span>
                  </div>
                  <div style={{ backgroundColor: subtle, border: `1px solid ${border}`, borderRadius: '0 12px 12px 12px', padding: '12px 16px' }}>
                    <p style={{ fontSize: '13.5px', color: text, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{selected.description}</p>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {selected.replies?.map((r: any) => (
                <div key={r.id} style={{ display: 'flex', gap: '12px' }}>
                  <Avatar name={`${r.author.firstName} ${r.author.lastName}`} size={34} staff={r.isStaff} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: text }}>{r.author.firstName} {r.author.lastName}</span>
                      {r.isStaff && (
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '6px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', letterSpacing: '0.03em' }}>SUPPORT</span>
                      )}
                      <span style={{ fontSize: '11px', color: muted }}>{ago(r.createdAt)}</span>
                    </div>
                    <div style={{
                      backgroundColor: r.isStaff ? (dark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)') : subtle,
                      border: `1px solid ${r.isStaff ? 'rgba(99,102,241,0.2)' : border}`,
                      borderRadius: '0 12px 12px 12px', padding: '12px 16px',
                    }}>
                      <p style={{ fontSize: '13.5px', color: text, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {selected.status !== 'CLOSED' ? (
              <div style={{ padding: '16px 22px', borderTop: `1px solid ${border}` }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && reply.trim()) replyMut.mutate({ id: selected.id, content: reply.trim() }) }}
                    placeholder="Reply to this ticket… (Ctrl+Enter to send)"
                    rows={3}
                    style={{ ...inp, resize: 'none', paddingRight: '56px', lineHeight: 1.6 }}
                  />
                  <button
                    onClick={() => { if (reply.trim()) replyMut.mutate({ id: selected.id, content: reply.trim() }) }}
                    disabled={!reply.trim() || replyMut.isPending}
                    style={{
                      position: 'absolute', right: '10px', bottom: '10px',
                      width: '36px', height: '36px', borderRadius: '10px',
                      backgroundColor: reply.trim() ? '#6366f1' : (dark ? '#1e293b' : '#e2e8f0'),
                      border: 'none', cursor: reply.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Send size={15} color={reply.trim() ? '#fff' : muted} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '14px 22px', borderTop: `1px solid ${border}`, textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: muted, margin: 0 }}>This ticket is closed and cannot receive new replies.</p>
              </div>
            )}
          </div>
        ) : !isMobile && tickets.length > 0 ? (
          <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: '18px', padding: '72px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
              <MessageSquare size={24} color="#fff" />
            </div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: text, margin: 0, letterSpacing: '-0.02em' }}>Open a conversation</p>
            <p style={{ fontSize: '13px', color: muted, margin: 0, maxWidth: '240px', lineHeight: 1.55 }}>Select a ticket from the left to view the full conversation</p>
          </div>
        ) : null}
      </div>

      {/* ── New Ticket Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: '22px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: '700', color: text, margin: '0 0 3px', letterSpacing: '-0.02em' }}>New Support Ticket</h2>
                <p style={{ fontSize: '12.5px', color: muted, margin: 0 }}>Describe your issue and we'll get back to you</p>
              </div>
              <button onClick={() => setModal(false)} style={{ width: 32, height: 32, borderRadius: '9px', background: 'none', border: `1px solid ${border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject *</label>
                <input
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Can't export my tasks to CSV"
                  style={inp}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inp, cursor: 'pointer', appearance: 'none' as any, WebkitAppearance: 'none' as any }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ ...inp, cursor: 'pointer', appearance: 'none' as any, WebkitAppearance: 'none' as any, color: PRIORITY_COLOR[form.priority] }}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue in detail — what happened, what you expected, and any steps to reproduce…"
                  rows={5}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => setModal(false)}
                  style={{ padding: '11px', borderRadius: '11px', backgroundColor: subtle, border: `1px solid ${border}`, color: muted, cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!form.subject.trim() || !form.description.trim()) return toast.error('Subject and description are required')
                    createMut.mutate(form)
                  }}
                  disabled={createMut.isPending}
                  style={{ padding: '11px', borderRadius: '11px', backgroundColor: '#6366f1', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                >
                  {createMut.isPending ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}