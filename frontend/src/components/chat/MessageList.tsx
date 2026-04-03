import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Flag, Pencil, Trash2, Check, X, Phone, Play, Pause } from 'lucide-react'
import type { ChatMessage } from '../../types'

const EDIT_WINDOW_MS = 15 * 60 * 1000

interface Props {
  messages: ChatMessage[]
  currentUserId: string
  otherLastRead?: string
  onReport: (messageId: string) => void
  onEditSave: (msgId: string, content: string) => void
  onDelete: (msgId: string) => void
  fetchPreviousPage: () => void
  hasPreviousPage: boolean
  isFetchingPreviousPage: boolean
  // Visual
  isDark: boolean
  isDefaultTheme: boolean
  myBubble: string
  myBubbleText: string
  theirBubble: string
  theirBubbleText: string
  chatFont: string
  bubbleRadius: string
  accent: string
  colors: Record<string, string>
  chatThemeBorderStyle?: string
  chatThemeBorder: string
}

export function MessageList({
  messages, currentUserId, otherLastRead,
  onReport, onEditSave, onDelete,
  fetchPreviousPage, hasPreviousPage, isFetchingPreviousPage,
  isDark, isDefaultTheme, myBubble, myBubbleText, theirBubble, theirBubbleText,
  chatFont, bubbleRadius, accent, colors, chatThemeBorderStyle, chatThemeBorder,
}: Props) {
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const savedScrollHeight = useRef(0)
  const isAtBottom = useRef(true)
  const initialLoad = useRef(true)

  // Save scroll height when fetch starts
  useEffect(() => {
    if (isFetchingPreviousPage && containerRef.current) {
      savedScrollHeight.current = containerRef.current.scrollHeight
    }
  }, [isFetchingPreviousPage])

  // Scroll management: restore position after old pages load, auto-scroll for new messages
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || messages.length === 0) return

    if (initialLoad.current) {
      container.scrollTop = container.scrollHeight
      initialLoad.current = false
      return
    }

    if (savedScrollHeight.current > 0 && !isFetchingPreviousPage) {
      // Older pages just loaded: restore scroll position
      container.scrollTop = container.scrollHeight - savedScrollHeight.current
      savedScrollHeight.current = 0
    } else if (isAtBottom.current) {
      // New message arrived: auto-scroll if at bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isFetchingPreviousPage])

  // Track whether user is near bottom
  const handleScroll = () => {
    const container = containerRef.current
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    isAtBottom.current = distFromBottom < 80
  }

  // IntersectionObserver: load older messages when top sentinel is visible
  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasPreviousPage && !isFetchingPreviousPage) {
          fetchPreviousPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage])

  const canEditOrDelete = (msg: ChatMessage) =>
    msg.senderId === currentUserId &&
    !msg.deletedAt &&
    Date.now() - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS

  const startEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id)
    setEditContent(msg.content || '')
  }

  const saveEdit = (msgId: string) => {
    const trimmed = editContent.trim()
    if (trimmed) onEditSave(msgId, trimmed)
    setEditingMsgId(null)
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}
    >
      {/* Top sentinel for infinite scroll */}
      <div ref={topSentinelRef} style={{ height: '1px', flexShrink: 0 }} />
      {isFetchingPreviousPage && (
        <div style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: colors.textMuted }}>
          Loading older messages...
        </div>
      )}

      {messages.map(msg => {
        const isMine = msg.senderId === currentUserId

        // CALL messages: centered system pill
        if (msg.type === 'CALL') {
          const isMissed = msg.content === 'Missed call'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '999px',
                backgroundColor: isDefaultTheme ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : `${accent}22`,
                fontSize: '12px', color: isMissed ? '#ef4444' : colors.textMuted,
              }}>
                <Phone size={13} />
                <span>{msg.content}</span>
                <span style={{ opacity: 0.6 }}>
                  · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        }

        const isEditing = editingMsgId === msg.id
        const editable = canEditOrDelete(msg)

        return (
          <div
            key={msg.id}
            style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '4px' }}
            onMouseEnter={() => setHoveredMsgId(msg.id)}
            onMouseLeave={() => setHoveredMsgId(null)}
          >
            {/* Report button (other's messages only) */}
            {!isMine && !msg.deletedAt && (
              <button
                onClick={() => onReport(msg.id)}
                title="Report message"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  color: colors.textMuted, opacity: hoveredMsgId === msg.id ? 0.7 : 0,
                  transition: 'opacity 0.15s', flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Flag size={12} />
              </button>
            )}

            {/* Message bubble */}
            <div style={{
              maxWidth: '70%', padding: '10px 14px', borderRadius: bubbleRadius,
              background: isMine ? (myBubble.startsWith('linear') ? myBubble : undefined) : undefined,
              backgroundColor: isMine ? (myBubble.startsWith('linear') ? undefined : myBubble) : theirBubble,
              color: isMine ? myBubbleText : theirBubbleText,
              borderBottomRightRadius: isMine && bubbleRadius === '16px' ? '4px' : undefined,
              borderBottomLeftRadius: !isMine && bubbleRadius === '16px' ? '4px' : undefined,
              border: chatThemeBorderStyle ? `${chatThemeBorderStyle} ${chatThemeBorder}` : undefined,
              fontFamily: chatFont,
            }}>
              {msg.deletedAt ? (
                <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.5', fontStyle: 'italic', opacity: 0.6 }}>
                  Message deleted
                </p>
              ) : isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id) }
                      if (e.key === 'Escape') setEditingMsgId(null)
                    }}
                    autoFocus
                    style={{
                      background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px', color: 'inherit', fontSize: '14px', padding: '4px 8px',
                      fontFamily: chatFont, resize: 'vertical', minHeight: '60px', width: '100%',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setEditingMsgId(null)}
                      style={{ background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '4px', padding: '3px 8px', color: 'inherit', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <X size={11} /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(msg.id)}
                      style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', padding: '3px 8px', color: 'inherit', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Check size={11} /> Save
                    </button>
                  </div>
                </div>
              ) : msg.type === 'VOICE' ? (
                <VoiceMessagePlayer audioData={msg.audioData ?? undefined} audioUrl={msg.audioUrl ?? undefined} duration={msg.audioDuration || 0} isMine={isMine} isDark={isDark} />
              ) : (
                <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.5', wordBreak: 'break-word' }}>
                  {msg.content}
                </p>
              )}

              {!isEditing && (
                <p style={{ fontSize: '10px', margin: '4px 0 0', textAlign: 'right', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                  {msg.editedAt && <span style={{ fontSize: '10px', opacity: 0.6 }}>edited</span>}
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMine && (
                    <span style={{
                      color: otherLastRead && new Date(msg.createdAt) <= new Date(otherLastRead) ? '#60a5fa' : 'inherit',
                      fontSize: '11px', fontWeight: '700', letterSpacing: '-1px',
                    }}>
                      {otherLastRead && new Date(msg.createdAt) <= new Date(otherLastRead) ? '✓✓' : '✓'}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Edit/delete buttons (own messages only, within 15-min window) */}
            {isMine && editable && hoveredMsgId === msg.id && !isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                <button
                  onClick={() => startEdit(msg)}
                  title="Edit message"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: colors.textMuted, display: 'flex', alignItems: 'center' }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  title="Delete message"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#ef4444', opacity: 0.7, display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        )
      })}

      <div ref={messagesEndRef} />
    </div>
  )
}

// ── Voice message playback ────────────────────────────────────────

function VoiceMessagePlayer({ audioData, audioUrl, duration, isMine, isDark }: {
  audioData?: string; audioUrl?: string; duration: number; isMine: boolean; isDark: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const getAudioSrc = () => {
    if (audioUrl) return `/api/chat/audio/${audioUrl}`
    if (audioData) return `data:audio/webm;codecs=opus;base64,${audioData}`
    return null
  }

  const toggle = () => {
    if (!audioRef.current) {
      const src = getAudioSrc()
      if (!src) return
      const audio = new Audio(src)
      audioRef.current = audio
      audio.ontimeupdate = () => setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
      audio.onended = () => { setPlaying(false); setProgress(0) }
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
      <button onClick={toggle} style={{
        width: '30px', height: '30px', borderRadius: '50%', border: 'none', flexShrink: 0,
        backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : (isDark ? '#334155' : '#e2e8f0'),
        color: isMine ? '#fff' : '#6366f1', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: '4px', borderRadius: '999px', backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : (isDark ? '#334155' : '#e2e8f0') }}>
          <div style={{ height: '100%', width: `${progress}%`, borderRadius: '999px', backgroundColor: isMine ? '#fff' : '#6366f1', transition: 'width 0.1s' }} />
        </div>
      </div>
      <span style={{ fontSize: '11px', opacity: 0.8, flexShrink: 0 }}>{duration}s</span>
    </div>
  )
}
