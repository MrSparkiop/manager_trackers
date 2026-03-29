import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from 'react-router-dom'
import {
  MessageSquare, Search, Send, Mic, Square, X, Play, Pause, ArrowLeft,
  Phone, PhoneOff, PhoneCall, MicOff, Monitor, Maximize2, Minimize2,
} from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { useAuthStore } from '../store/authStore'
import { useIsMobile } from '../lib/useIsMobile'
import { useColors } from '../lib/useColors'
import { queryKeys } from '../lib/queryKeys'
import { connectChatSocket, getChatSocket } from '../lib/chatSocket'
import api from '../lib/axios'
import { startRingtone, stopRingtone, startCallingTone, stopCallingTone, playEndCallTone, stopAllCallSounds } from '../lib/callSounds'
import { useChatStore } from '../store/chatStore'
import type { Conversation, ChatMessage, ChatUser } from '../types'
import toast from 'react-hot-toast'

// ── WebRTC config ─────────────────────────────────────────────────
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

type CallState = 'idle' | 'calling' | 'ringing' | 'active'

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function ChatPage() {
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const isMobile = useIsMobile()
  const colors = useColors(isDark)
  const queryClient = useQueryClient()

  // Persist active conversation across navigation via global store
  const activeConvId = useChatStore(s => s.activeConvId)
  const setActiveConvId = useChatStore(s => s.setActiveConvId)
  const setCallSnapshot = useChatStore(s => s.setCallSnapshot)

  const [message, setMessage] = useState('')
  const [searchUsers, setSearchUsers] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // Voice message recording
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartRef = useRef<number>(0)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  // ── Voice call state ─────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>('idle')
  const [callPeer, setCallPeer] = useState<{ userId: string; userName: string } | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Refs — always current even in stale socket closures
  const callStateRef = useRef<CallState>('idle')
  callStateRef.current = callState
  const callPeerRef = useRef<{ userId: string; userName: string } | null>(null)
  callPeerRef.current = callPeer

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const incomingCallRef = useRef<{
    from: { userId: string; userName: string }
    conversationId: string
    offer: RTCSessionDescriptionInit
  } | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef = useRef<number>(0)
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([])

  const screenStreamRef = useRef<MediaStream | null>(null)
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeConvIdRef = useRef<string | null>(null)
  activeConvIdRef.current = activeConvId

  // Keep a ref to otherUser so startCall always has the current value (typed below after getOtherUser)
  const otherUserRef = useRef<{ id: string; firstName: string; lastName: string } | undefined>(undefined)


  // ── cleanupCall (stored in ref so socket handlers can call it) ─
  const cleanupCall = useCallback(() => {
    stopAllCallSounds()
    if (callStateRef.current === 'active') playEndCallTone()
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null }
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    if (remoteScreenVideoRef.current) remoteScreenVideoRef.current.srcObject = null
    incomingCallRef.current = null
    iceCandidateQueueRef.current = []
    setCallState('idle')
    setCallPeer(null)
    setCallDuration(0)
    setIsMuted(false)
    setIsScreenSharing(false)
    setIsRemoteScreenSharing(false)
  }, [])

  const cleanupCallRef = useRef(cleanupCall)
  cleanupCallRef.current = cleanupCall

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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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

  // ── Sync call state to global store (for floating Layout widget) ────
  useEffect(() => {
    setCallSnapshot(callState, callPeer, callDuration)
  }, [callState, callPeer, callDuration, setCallSnapshot])

  // ── Navigation blocker during active/ringing/calling state ───────
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      callState !== 'idle' && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const ok = window.confirm('You are in a call. Hang up and leave?')
      if (ok) {
        hangUp()
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker.state]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket (registered once on mount, removed on unmount) ────────

  useEffect(() => {
    const socket = connectChatSocket() // returns already-connected socket from App.tsx

    // On (re)connect: re-join the active conversation room so we keep receiving messages
    socket.on('connect', () => {
      const convId = activeConvIdRef.current
      if (convId) {
        socket.emit('join_conversation', convId)
        socket.emit('mark_read', convId)
      }
    })

    // ── Presence ──
    socket.on('online_users_list', (data: { userIds: string[] }) => {
      setOnlineUsers(new Set(data.userIds))
    })
    socket.on('user_online', (data: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId))
    })
    socket.on('user_offline', (data: { userId: string }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(data.userId); return s })
    })

    // ── Messages ──
    socket.on('new_message', (msg: ChatMessage) => {
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

    // ── Voice call signaling ──
    socket.on('call_incoming', (data: { from: { userId: string; userName: string }; conversationId: string; offer: RTCSessionDescriptionInit }) => {
      if (callStateRef.current !== 'idle') {
        socket.emit('call_reject', { targetUserId: data.from.userId })
        return
      }
      incomingCallRef.current = data
      setCallState('ringing')
      setCallPeer(data.from)
      startRingtone()
    })

    socket.on('call_answered', async (data: { answer: RTCSessionDescriptionInit }) => {
      stopCallingTone()
      const pc = peerConnectionRef.current
      if (!pc) return
      try {
        await pc.setRemoteDescription(data.answer)
        for (const c of iceCandidateQueueRef.current) {
          await pc.addIceCandidate(c).catch(() => {})
        }
        iceCandidateQueueRef.current = []
        setCallState('active')
        callStartRef.current = Date.now()
        callTimerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000))
        }, 1000)
      } catch { /* ignore */ }
    })

    socket.on('call_rejected', () => {
      toast('Call was declined', { icon: '📵' })
      cleanupCallRef.current()
    })

    socket.on('call_ended', () => {
      if (callStateRef.current !== 'idle') {
        cleanupCallRef.current()
      }
    })

    socket.on('ice_candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current
      if (pc?.remoteDescription) {
        await pc.addIceCandidate(data.candidate).catch(() => {})
      } else {
        iceCandidateQueueRef.current.push(data.candidate)
      }
    })

    socket.on('screen_offer', async (data: { offer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionRef.current
      const peer = callPeerRef.current
      if (!pc || !peer) return
      try {
        await pc.setRemoteDescription(data.offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        getChatSocket()?.emit('screen_answer', { targetUserId: peer.userId, answer })
      } catch { /* ignore */ }
    })

    socket.on('screen_answer', async (data: { answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionRef.current
      if (!pc) return
      try { await pc.setRemoteDescription(data.answer) } catch { /* ignore */ }
    })

    socket.on('screen_share_stopped', () => {
      if (remoteScreenVideoRef.current) remoteScreenVideoRef.current.srcObject = null
      setIsRemoteScreenSharing(false)
    })

    // Remove all listeners on unmount (socket itself stays alive — managed by App.tsx)
    return () => { socket.removeAllListeners() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Join/leave conversation room
  useEffect(() => {
    const socket = getChatSocket()
    if (!socket || !activeConvId) return
    socket.emit('join_conversation', activeConvId)
    socket.emit('mark_read', activeConvId)
    return () => { socket.emit('leave_conversation', activeConvId) }
  }, [activeConvId])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll messages every 3s as reliability fallback
  useEffect(() => {
    if (!activeConvId) return
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(activeConvId) })
    }, 3000)
    return () => clearInterval(interval)
  }, [activeConvId, queryClient])

  // Cleanup call on unmount
  useEffect(() => {
    return () => { cleanupCallRef.current() }
  }, [])

  // ── Voice call handlers ────────────────────────────────────────

  const buildPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getChatSocket()?.emit('ice_candidate', { targetUserId, candidate: e.candidate.toJSON() })
      }
    }

    pc.ontrack = (e) => {
      if (e.track.kind === 'video') {
        if (remoteScreenVideoRef.current) remoteScreenVideoRef.current.srcObject = e.streams[0]
        setIsRemoteScreenSharing(true)
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0]
      }
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanupCallRef.current()
      }
    }

    return pc
  }, [])

  const startCall = useCallback(async () => {
    // Use refs — always current, no stale-closure risk
    const convId = activeConvIdRef.current
    const target = otherUserRef.current
    if (!convId) { toast.error('No conversation selected'); return }
    if (callStateRef.current !== 'idle') { toast.error('Already in a call'); return }
    if (!target) { toast.error('Could not find the other user'); return }

    const socket = getChatSocket()
    if (!socket?.connected) {
      toast.error('Chat connection lost — please refresh the page')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const pc = buildPeerConnection(target.id)
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socket.emit('call_offer', {
        conversationId: convId,
        offer,
        targetUserId: target.id,
      })

      setCallState('calling')
      setCallPeer({ userId: target.id, userName: `${target.firstName} ${target.lastName}` })
      startCallingTone()

      // Auto-hangup after 30s if nobody answers
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'calling') {
          getChatSocket()?.emit('call_end', { targetUserId: target.id })
          getChatSocket()?.emit('call_missed', { conversationId: convId, targetUserId: target.id })
          cleanupCallRef.current()
          toast('No answer', { icon: '📵' })
        }
      }, 30_000)
    } catch (err) {
      console.error('[startCall] error:', err)
      toast.error('Could not start call — check microphone permissions')
      cleanupCallRef.current()
    }
  }, [buildPeerConnection])

  const answerCall = useCallback(async () => {
    const incoming = incomingCallRef.current
    if (callStateRef.current !== 'ringing' || !incoming) return
    stopRingtone()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const pc = buildPeerConnection(incoming.from.userId)
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      await pc.setRemoteDescription(incoming.offer)
      for (const c of iceCandidateQueueRef.current) {
        await pc.addIceCandidate(c).catch(() => {})
      }
      iceCandidateQueueRef.current = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      getChatSocket()?.emit('call_answer', {
        targetUserId: incoming.from.userId,
        answer,
      })

      setCallState('active')
      callStartRef.current = Date.now()
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000))
      }, 1000)
    } catch {
      toast.error('Could not access microphone')
      rejectCall()
    }
  }, [buildPeerConnection]) // eslint-disable-line react-hooks/exhaustive-deps

  const rejectCall = useCallback(() => {
    const incoming = incomingCallRef.current
    if (incoming) {
      getChatSocket()?.emit('call_reject', { targetUserId: incoming.from.userId })
    }
    cleanupCallRef.current()
  }, [])

  const hangUp = useCallback(() => {
    const peer = callPeerRef.current
    if (peer) {
      getChatSocket()?.emit('call_end', {
        targetUserId: peer.userId,
        conversationId: activeConvIdRef.current,
        duration: callStateRef.current === 'active' ? Math.floor((Date.now() - callStartRef.current) / 1000) : 0,
      })
    }
    cleanupCallRef.current()
  }, [])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsMuted(!track.enabled)
    }
  }, [])

  const stopScreenShareRef = useRef<() => void>(() => {})

  const stopScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current
    const peer = callPeerRef.current
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    setIsScreenSharing(false)
    if (!pc || !peer) return
    getChatSocket()?.emit('screen_share_stopped', { targetUserId: peer.userId })
    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
    if (sender) pc.removeTrack(sender)
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      getChatSocket()?.emit('screen_offer', { targetUserId: peer.userId, offer })
    } catch { /* ignore */ }
  }, [])

  stopScreenShareRef.current = stopScreenShare

  const startScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current
    const peer = callPeerRef.current
    if (!pc || callStateRef.current !== 'active' || !peer) return
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      screenStreamRef.current = stream
      const videoTrack = stream.getVideoTracks()[0]
      pc.addTrack(videoTrack, stream)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      getChatSocket()?.emit('screen_offer', { targetUserId: peer.userId, offer })
      setIsScreenSharing(true)
      videoTrack.onended = () => stopScreenShareRef.current()
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') toast.error('Could not share screen')
    }
  }, [])

  // ── Text message handlers ──────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!activeConvId || !message.trim()) return
    const text = message.trim()
    setMessage('')
    try {
      const { data: newMsg } = await api.post(`/chat/conversations/${activeConvId}/messages`, {
        content: text, type: 'TEXT',
      })
      queryClient.setQueryData<{ messages: ChatMessage[] }>(
        queryKeys.chat.messages(activeConvId),
        (old) => old ? { ...old, messages: [...old.messages, newMsg] } : { messages: [newMsg] },
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
      getChatSocket()?.emit('stop_typing', activeConvId)
    } catch {
      setMessage(text)
      toast.error('Failed to send message')
    }
  }, [activeConvId, message, queryClient])

  const handleTyping = useCallback(() => {
    const socket = getChatSocket()
    if (!socket || !activeConvId) return
    socket.emit('typing', activeConvId)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', activeConvId)
    }, 2000)
  }, [activeConvId])

  // ── Voice message recording ────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      recordingStartRef.current = Date.now()
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        setAudioDuration(Math.round((Date.now() - recordingStartRef.current) / 1000))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch { toast.error('Microphone access denied') }
  }

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false) }
  const cancelRecording = () => { setAudioBlob(null); setAudioDuration(0); setIsPlaying(false) }

  const sendVoiceMessage = async () => {
    if (!activeConvId || !audioBlob) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const { data: newMsg } = await api.post(`/chat/conversations/${activeConvId}/messages`, {
          type: 'VOICE', audioData: base64, audioDuration,
        })
        queryClient.setQueryData<{ messages: ChatMessage[] }>(
          queryKeys.chat.messages(activeConvId),
          (old) => old ? { ...old, messages: [...old.messages, newMsg] } : { messages: [newMsg] },
        )
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
        cancelRecording()
      } catch { toast.error('Failed to send voice message') }
    }
    reader.readAsDataURL(audioBlob)
  }

  const playPreview = () => {
    if (!audioBlob) return
    if (isPlaying) { audioPlayerRef.current?.pause(); setIsPlaying(false); return }
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
  // Keep ref in sync so startCall/hangUp can read the latest value without stale closures
  otherUserRef.current = otherUser ?? undefined

  // Other participant's lastReadAt — for read receipts
  const otherLastRead = activeConversation
    ?.participants.find(p => p.userId !== user?.id)?.lastReadAt

  const showList = isMobile ? !activeConvId : true
  const showChat = isMobile ? !!activeConvId : true

  // ── PRO gate ───────────────────────────────────────────────────

  if (user?.role === 'USER') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '16px', color: colors.textMuted, fontFamily: 'Inter, sans-serif',
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
      display: 'flex', height: '100%', fontFamily: 'Inter, sans-serif',
      backgroundColor: colors.bg, overflow: 'hidden',
    }}>
      {/* Hidden remote audio element */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {/* ── Fullscreen call overlay ───────────────────────────── */}
      {isFullscreen && callState === 'active' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '24px', fontFamily: 'Inter, sans-serif',
        }}>
          {/* Minimize button */}
          <button onClick={() => setIsFullscreen(false)} style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: '44px', height: '44px', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Exit fullscreen">
            <Minimize2 size={20} />
          </button>

          {/* Remote screen share — shown fullscreen when active */}
          {isRemoteScreenSharing && (
            <div style={{
              position: 'absolute', inset: '80px 0 160px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#000',
            }}>
              <video
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                ref={el => { if (el && remoteScreenVideoRef.current?.srcObject) { el.srcObject = remoteScreenVideoRef.current.srcObject } }}
              />
              <div style={{
                position: 'absolute', top: '10px', left: '10px',
                background: 'rgba(0,0,0,0.6)', borderRadius: '6px',
                padding: '3px 10px', fontSize: '12px', color: '#fff',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <Monitor size={12} /> {callPeer?.userName} is sharing
              </div>
            </div>
          )}

          {/* Peer avatar + info */}
          {!isRemoteScreenSharing && (
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{
                width: '96px', height: '96px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: '800', margin: '0 auto 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}>
                {callPeer?.userName.charAt(0)}
              </div>
              <p style={{ fontSize: '26px', fontWeight: '700', margin: '0 0 6px' }}>
                {callPeer?.userName}
              </p>
              <p style={{ fontSize: '18px', opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(callDuration)}
              </p>
            </div>
          )}

          {/* Controls */}
          <div style={{
            position: 'absolute', bottom: '40px',
            display: 'flex', gap: '20px', alignItems: 'center',
          }}>
            <button onClick={toggleMute} style={{
              width: '60px', height: '60px', borderRadius: '50%', border: 'none',
              backgroundColor: isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} style={{
              width: '60px', height: '60px', borderRadius: '50%', border: 'none',
              backgroundColor: isScreenSharing ? '#f59e0b' : 'rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
              <Monitor size={22} />
            </button>
            <button onClick={() => { hangUp(); setIsFullscreen(false) }} style={{
              width: '72px', height: '72px', borderRadius: '50%', border: 'none',
              backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
            }} title="End call">
              <PhoneOff size={26} />
            </button>
          </div>
        </div>
      )}

      {/* ── Incoming call overlay (fixed, top-right) ─────────── */}
      {callState === 'ringing' && callPeer && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 1000,
          backgroundColor: isDark ? '#1e293b' : '#fff',
          borderRadius: '20px', padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          width: '270px',
          border: `1px solid ${colors.border}`,
        }}>
          {/* Pulsing ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                backgroundColor: 'rgba(34,197,94,0.15)',
                animation: 'callRingPulse 1.5s infinite',
              }} />
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: '700', color: '#fff',
              }}>
                {callPeer.userName.charAt(0)}
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '16px', fontWeight: '700', color: colors.text, margin: '0 0 4px' }}>
            {callPeer.userName}
          </p>
          <p style={{ textAlign: 'center', fontSize: '13px', color: colors.textMuted, margin: '0 0 20px' }}>
            Incoming voice call...
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={rejectCall} style={{
              width: '52px', height: '52px', borderRadius: '50%', border: 'none',
              backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title="Decline">
              <PhoneOff size={22} />
            </button>
            <button onClick={answerCall} style={{
              width: '52px', height: '52px', borderRadius: '50%', border: 'none',
              backgroundColor: '#22c55e', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title="Accept">
              <PhoneCall size={22} />
            </button>
          </div>
        </div>
      )}

      {/* ── Conversation List ─────────────────────────────────── */}
      {showList && (
        <div style={{
          width: isMobile ? '100%' : '320px', minWidth: isMobile ? '100%' : '320px',
          backgroundColor: colors.card, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${colors.border}`, minHeight: 0,
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
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700', color: '#fff',
                    }}>
                      {other.firstName[0]}{other.lastName[0]}
                    </div>
                    {onlineUsers.has(other.id) && (
                      <span style={{
                        position: 'absolute', bottom: '1px', right: '1px',
                        width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: '#22c55e', border: `2px solid ${colors.card}`,
                      }} />
                    )}
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
                      <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg?.type === 'CALL' ? '📞 ' + lastMsg.content
                          : lastMsg?.type === 'VOICE' ? '🎙 Voice message'
                          : lastMsg?.content || 'No messages yet'}
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

      {/* ── Message Area ─────────────────────────────────────── */}
      {showChat && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {!activeConvId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: colors.textMuted }}>
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '16px' }}>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 20px', borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.card, flexShrink: 0,
              }}>
                {/* Normal header content */}
                {isMobile && (
                  <button onClick={() => setActiveConvId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: 0 }}>
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: '#fff',
                }}>
                  {otherUser?.firstName[0]}{otherUser?.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: colors.text, margin: 0 }}>
                    {otherUser?.firstName} {otherUser?.lastName}
                  </p>
                  {typingUser ? (
                    <p style={{ fontSize: '11px', color: '#6366f1', margin: 0, fontWeight: '500' }}>typing...</p>
                  ) : otherUser && onlineUsers.has(otherUser.id) ? (
                    <p style={{ fontSize: '11px', color: '#22c55e', margin: 0, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                      Online
                    </p>
                  ) : (
                    <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>
                      {otherUser?.lastSeenAt
                        ? `Last seen ${new Date(otherUser.lastSeenAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : 'Offline'}
                    </p>
                  )}
                </div>

                {/* Call button (idle only) */}
                {callState === 'idle' && (
                  <button onClick={startCall} style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                    color: '#22c55e', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }} title="Start voice call">
                    <Phone size={17} />
                  </button>
                )}

                {/* Calling overlay bar */}
                {(callState === 'calling' || callState === 'active') && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: callState === 'active' ? '#16a34a' : (isDark ? '#1e293b' : '#f8fafc'),
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px',
                    borderBottom: callState === 'calling' ? `1px solid ${colors.border}` : 'none',
                  }}>
                    {callState === 'calling' ? (
                      <>
                        {/* Pulsing dot */}
                        <span style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          backgroundColor: '#6366f1', display: 'inline-block',
                          animation: 'callDotPulse 1s infinite',
                        }} />
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: colors.text }}>
                          Calling {callPeer?.userName}...
                        </span>
                        <button onClick={hangUp} style={{
                          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                          backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} title="Cancel">
                          <PhoneOff size={17} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Phone size={17} style={{ color: '#fff', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                          {callPeer?.userName} · {formatDuration(callDuration)}
                        </span>
                        {/* Mute */}
                        <button onClick={toggleMute} style={{
                          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                          backgroundColor: isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
                          color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} title={isMuted ? 'Unmute' : 'Mute'}>
                          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        {/* Share Screen */}
                        <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} style={{
                          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                          backgroundColor: isScreenSharing ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                          color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
                          <Monitor size={16} />
                        </button>
                        {/* Fullscreen */}
                        <button onClick={() => setIsFullscreen(true)} style={{
                          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} title="Fullscreen">
                          <Maximize2 size={16} />
                        </button>
                        {/* Hang up */}
                        <button onClick={hangUp} style={{
                          width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                          backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} title="End call">
                          <PhoneOff size={17} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Remote Screen Share Panel — always mounted so ref is always set */}
              <div style={{
                flexShrink: 0, backgroundColor: '#000', position: 'relative',
                display: isRemoteScreenSharing ? 'block' : 'none',
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <video
                  ref={remoteScreenVideoRef}
                  autoPlay
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', top: '8px', left: '8px',
                  backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '6px',
                  padding: '3px 8px', fontSize: '11px', color: '#fff',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <Monitor size={11} />
                  {callPeer?.userName} is sharing their screen
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {messages.map(msg => {
                  const isMine = msg.senderId === user?.id

                  // CALL messages render as centered system messages
                  if (msg.type === 'CALL') {
                    const isMissed = msg.content === 'Missed call'
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 14px', borderRadius: '999px',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
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
                        <p style={{ fontSize: '10px', margin: '4px 0 0', textAlign: 'right', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && (
                            <span style={{
                              color: otherLastRead && new Date(msg.createdAt) <= new Date(otherLastRead)
                                ? '#60a5fa' : 'inherit',
                              fontSize: '11px', fontWeight: '700', letterSpacing: '-1px',
                            }}>
                              {otherLastRead && new Date(msg.createdAt) <= new Date(otherLastRead) ? '✓✓' : '✓'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.card, flexShrink: 0 }}>
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
                    }}>Send</button>
                  </div>
                )}

                {/* Text + mic input */}
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
