import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Search, Send, Mic, Square, X, Play, Pause, ArrowLeft } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { useAuthStore } from '../store/authStore'
import { useIsMobile } from '../lib/useIsMobile'
import { useColors } from '../lib/useColors'
import { queryKeys } from '../lib/queryKeys'
import { connectChatSocket, disconnectChatSocket, getChatSocket } from '../lib/chatSocket'
import api from '../lib/axios'
import type { Conversation, ChatMessage, ChatUser } from '../types'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const isMobile = useIsMobile()
  const colors = useColors(isDark)
  const queryClient = useQueryClient()

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchUsers, setSearchUsers] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartRef = useRef<number>(0)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeConvIdRef = useRef<string | null>(null)
  activeConvIdRef.current = activeConvId  // keep ref in sync for socket handlers

  // ── Queries ────────────────────────────────────────────────────

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: queryKeys.chat.conversations,
    queryFn: () => api.get('/chat/conversations').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: messagesData } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: queryKeys.chat.messages(activeConvId || ''),
    queryFn: () => api.get(`/chat/conversations/${activeConvId}/messages?limit=100`).then(r => r.data),
    enabled: !!activeConvId,
  })
  const messages = messagesData?.messages ?? []

  const { data: chatUsers = [] } = useQuery<ChatUser[]>({
    queryKey: [...queryKeys.chat.users, searchUsers],
    queryFn: () => api.get(`/chat/users?search=${searchUsers}`).then(r => r.data),
    enabled: showNewChat,
  })

  const startConvMutation = useMutation({
    mutationFn: (userId: string) => api.post('/chat/conversations', { userId }).then(r => r.data),
    onSuccess: (conv: Conversation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
      setActiveConvId(conv.id)
      setShowNewChat(false)
    },
  })

  // ── Socket connection (connect once on mount, disconnect on unmount) ──

  useEffect(() => {
    const socket = connectChatSocket()

    socket.on('new_message', (msg: ChatMessage) => {
      // Use the message's own conversationId — never a stale closure
      queryClient.setQueryData<{ messages: ChatMessage[] }>(
        queryKeys.chat.messages(msg.conversationId ?? activeConvIdRef.current ?? ''),
        (old) => old ? { ...old, messages: [...old.messages, msg] } : old,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    })

    socket.on('conversation_updated', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    })

    socket.on('user_typing', (data: { userId: string; userName: string }) => {
      if (data.userId !== user?.id) setTypingUser(data.userName)
    })

    socket.on('user_stop_typing', () => setTypingUser(null))

    return () => { disconnectChatSocket() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Join/leave conversation room when active changes
  useEffect(() => {
    const socket = getChatSocket()
    if (!socket || !activeConvId) return
    socket.emit('join_conversation', activeConvId)
    socket.emit('mark_read', activeConvId)
    return () => { socket.emit('leave_conversation', activeConvId) }
  }, [activeConvId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send text message ──────────────────────────────────────────

  const sendMessage = useCallback(() => {
    const socket = getChatSocket()
    if (!socket || !activeConvId || !message.trim()) return
    socket.emit('send_message', {
      conversationId: activeConvId,
      content: message.trim(),
      type: 'TEXT',
    })
    setMessage('')
  }, [activeConvId, message])

  // ── Typing indicator ───────────────────────────────────────────

  const handleTyping = useCallback(() => {
    const socket = getChatSocket()
    if (!socket || !activeConvId) return
    socket.emit('typing', activeConvId)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', activeConvId)
    }, 2000)
  }, [activeConvId])

  // ── Voice recording ────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      recordingStartRef.current = Date.now()

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        setAudioDuration(Math.round((Date.now() - recordingStartRef.current) / 1000))
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const cancelRecording = () => {
    setAudioBlob(null)
    setAudioDuration(0)
    setIsPlaying(false)
  }

  const sendVoiceMessage = () => {
    const socket = getChatSocket()
    if (!socket || !activeConvId || !audioBlob) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      socket.emit('send_message', {
        conversationId: activeConvId,
        type: 'VOICE',
        audioData: base64,
        audioDuration,
      })
      cancelRecording()
    }
    reader.readAsDataURL(audioBlob)
  }

  const playPreview = () => {
    if (!audioBlob) return
    if (isPlaying) {
      audioPlayerRef.current?.pause()
      setIsPlaying(false)
      return
    }
    const url = URL.createObjectURL(audioBlob)
    const audio = new Audio(url)
    audioPlayerRef.current = audio
    audio.onended = () => setIsPlaying(false)
    audio.play()
    setIsPlaying(true)
  }

  // ── Helpers ────────────────────────────────────────────────────

  const getOtherUser = (conv: Conversation) =>
    conv.participants.find(p => p.userId !== user?.id)?.user

  const activeConversation = conversations.find(c => c.id === activeConvId)
  const otherUser = activeConversation ? getOtherUser(activeConversation) : null

  const showList = isMobile ? !activeConvId : true
  const showChat = isMobile ? !!activeConvId : true

  // ── PRO gate ───────────────────────────────────────────────────

  if (user?.role === 'USER') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 'calc(100vh - 60px)', gap: '16px', color: colors.textMuted, fontFamily: 'Inter, sans-serif',
      }}>
        <MessageSquare size={48} style={{ opacity: 0.3 }} />
        <p style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>Chat is a PRO feature</p>
        <p style={{ fontSize: '14px' }}>Upgrade your plan to chat with other users.</p>
        <a href="/app/billing" style={{
          backgroundColor: '#6366f1', color: '#fff', borderRadius: '8px',
          padding: '10px 24px', textDecoration: 'none', fontWeight: '600', fontSize: '14px',
        }}>
          Upgrade to PRO
        </a>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 60px)', fontFamily: 'Inter, sans-serif',
      backgroundColor: colors.bg, overflow: 'hidden',
    }}>

      {/* ── Conversation List ────────────────────────────── */}
      {showList && (
        <div style={{
          width: isMobile ? '100%' : '320px', minWidth: isMobile ? '100%' : '320px',
          backgroundColor: colors.card, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${colors.border}`,
        }}>
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>Messages</h2>
              <button onClick={() => setShowNewChat(!showNewChat)} style={{
                backgroundColor: '#6366f1', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '6px 12px', fontSize: '12px',
                fontWeight: '600', cursor: 'pointer',
              }}>
                + New Chat
              </button>
            </div>
          </div>

          {/* New Chat User Search */}
          {showNewChat && (
            <div style={{ padding: '12px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.subBg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.input, borderRadius: '8px', padding: '8px 10px', border: `1px solid ${colors.inputBorder}` }}>
                <Search size={14} color={colors.textMuted} />
                <input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder="Search PRO users..."
                  style={{ background: 'none', border: 'none', color: colors.text, fontSize: '13px', outline: 'none', width: '100%' }} />
              </div>
              <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {chatUsers.map(u => (
                  <button key={u.id} onClick={() => startConvMutation.mutate(u.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    backgroundColor: 'transparent', color: colors.text, textAlign: 'left',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0,
                    }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>{u.firstName} {u.lastName}</p>
                      <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>{u.email}</p>
                    </div>
                  </button>
                ))}
                {chatUsers.length === 0 && searchUsers && (
                  <p style={{ fontSize: '12px', color: colors.textMuted, textAlign: 'center', padding: '12px' }}>No PRO users found</p>
                )}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted }}>
                <MessageSquare size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', margin: 0 }}>No conversations yet</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Start chatting with a PRO user</p>
              </div>
            ) : conversations.map(conv => {
              const other = getOtherUser(conv)
              if (!other) return null
              const isActive = conv.id === activeConvId
              const lastMsg = conv.lastMessage
              return (
                <button key={conv.id} onClick={() => setActiveConvId(conv.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                  padding: '14px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  backgroundColor: isActive ? (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)') : 'transparent',
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.text, transition: 'background 0.1s',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700', color: '#fff',
                  }}>
                    {other.firstName[0]}{other.lastName[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{
                        fontSize: '13px', fontWeight: conv.unreadCount > 0 ? '700' : '500', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {other.firstName} {other.lastName}
                      </p>
                      {lastMsg && (
                        <span style={{ fontSize: '10px', color: colors.textMuted, flexShrink: 0 }}>
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <p style={{
                        fontSize: '12px', color: colors.textMuted, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {lastMsg?.type === 'VOICE' ? 'Voice message' : lastMsg?.content || 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span style={{
                          backgroundColor: '#6366f1', color: '#fff', borderRadius: '999px',
                          padding: '1px 6px', fontSize: '10px', fontWeight: '700', flexShrink: 0,
                        }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Message Area ─────────────────────────────────── */}
      {showChat && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeConvId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: colors.textMuted }}>
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '16px' }}>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
                borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.card,
              }}>
                {isMobile && (
                  <button onClick={() => setActiveConvId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 0 }}>
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0,
                }}>
                  {otherUser?.firstName[0]}{otherUser?.lastName[0]}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: 0 }}>
                    {otherUser?.firstName} {otherUser?.lastName}
                  </p>
                  {typingUser ? (
                    <p style={{ fontSize: '11px', color: '#6366f1', margin: 0, fontWeight: '500' }}>typing...</p>
                  ) : (
                    <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>
                      {otherUser?.lastSeenAt
                        ? `Last seen ${new Date(otherUser.lastSeenAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : 'Offline'}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {messages.map(msg => {
                  const isMine = msg.senderId === user?.id
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px', borderRadius: '16px',
                        backgroundColor: isMine ? '#6366f1' : (isDark ? '#1e293b' : '#f1f5f9'),
                        color: isMine ? '#fff' : colors.text,
                        borderBottomRightRadius: isMine ? '4px' : '16px',
                        borderBottomLeftRadius: isMine ? '16px' : '4px',
                      }}>
                        {msg.type === 'VOICE' ? (
                          <VoiceMessagePlayer audioData={msg.audioData!} duration={msg.audioDuration || 0} isMine={isMine} isDark={isDark} />
                        ) : (
                          <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.5', wordBreak: 'break-word' }}>{msg.content}</p>
                        )}
                        <p style={{ fontSize: '10px', margin: '4px 0 0', textAlign: 'right', opacity: 0.7 }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.card }}>
                {/* Voice preview */}
                {audioBlob && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
                    padding: '10px 14px', borderRadius: '12px',
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    border: `1px solid ${colors.border}`,
                  }}>
                    <button onClick={playPreview} style={{
                      width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                      backgroundColor: '#6366f1', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: '4px', backgroundColor: colors.border, borderRadius: '999px' }}>
                        <div style={{ height: '100%', width: '100%', backgroundColor: '#6366f1', borderRadius: '999px' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>{audioDuration}s</span>
                    <button onClick={cancelRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '2px' }}>
                      <X size={16} />
                    </button>
                    <button onClick={sendVoiceMessage} style={{
                      backgroundColor: '#6366f1', color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '6px 14px', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer',
                    }}>
                      Send
                    </button>
                  </div>
                )}

                {/* Text input + mic */}
                {!audioBlob && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      value={message}
                      onChange={e => { setMessage(e.target.value); handleTyping() }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Type a message..."
                      style={{
                        flex: 1, backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                        border: `1px solid ${colors.border}`, borderRadius: '12px',
                        padding: '10px 14px', color: colors.text, fontSize: '14px', outline: 'none',
                      }}
                    />
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: isRecording ? '#ef4444' : (isDark ? '#1e293b' : '#f1f5f9'),
                        color: isRecording ? '#fff' : colors.textMuted,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        border: isRecording ? 'none' : `1px solid ${colors.border}`,
                      }}
                      title={isRecording ? 'Stop recording' : 'Record voice message'}
                    >
                      {isRecording ? <Square size={16} fill="#fff" /> : <Mic size={18} />}
                    </button>
                    {message.trim() && (
                      <button onClick={sendMessage} style={{
                        width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                        backgroundColor: '#6366f1', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Send size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Voice message playback component ─────────────────────────────

function VoiceMessagePlayer({ audioData, duration, isMine, isDark }: {
  audioData: string; duration: number; isMine: boolean; isDark: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(`data:audio/webm;codecs=opus;base64,${audioData}`)
      audioRef.current = audio
      audio.ontimeupdate = () => setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
      audio.onended = () => { setPlaying(false); setProgress(0) }
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
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
        <div style={{
          height: '4px', borderRadius: '999px',
          backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : (isDark ? '#334155' : '#e2e8f0'),
        }}>
          <div style={{
            height: '100%', width: `${progress}%`, borderRadius: '999px',
            backgroundColor: isMine ? '#fff' : '#6366f1', transition: 'width 0.1s',
          }} />
        </div>
      </div>
      <span style={{ fontSize: '11px', opacity: 0.8, flexShrink: 0 }}>{duration}s</span>
    </div>
  )
}
