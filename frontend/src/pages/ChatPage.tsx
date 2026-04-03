import { useState, useEffect, useRef, useCallback } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import {
  MessageSquare, ArrowLeft,
  Phone, PhoneOff, Mic, MicOff, Monitor, Maximize2, Flag,
} from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { useAuthStore } from '../store/authStore'
import { useIsMobile } from '../lib/useIsMobile'
import { useColors } from '../lib/useColors'
import { useChatThemeStore } from '../store/chatThemeStore'
import { CHAT_THEMES } from '../lib/chatThemes'
import { queryKeys } from '../lib/queryKeys'
import { connectChatSocket, getChatSocket } from '../lib/chatSocket'
import api from '../lib/axios'
import { startRingtone, stopRingtone, startCallingTone, stopCallingTone, playEndCallTone, stopAllCallSounds } from '../lib/callSounds'
import { useChatStore } from '../store/chatStore'
import { ConversationSidebar } from '../components/chat/ConversationSidebar'
import { MessageList } from '../components/chat/MessageList'
import { MessageInput } from '../components/chat/MessageInput'
import { CallOverlay, type CallState } from '../components/chat/CallOverlay'
import type { Conversation, ChatMessage, ChatUser } from '../types'
import toast from 'react-hot-toast'

// ── WebRTC config ─────────────────────────────────────────────────
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

interface MsgPage {
  messages: ChatMessage[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function ChatPage() {
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const isMobile = useIsMobile()
  const baseColors = useColors(isDark)
  const chatThemeId = useChatThemeStore(s => s.chatThemeId)
  const chatTheme = CHAT_THEMES.find(t => t.id === chatThemeId) ?? CHAT_THEMES[0]
  const isDefaultTheme = chatTheme.id === 'default'

  const colors = {
    ...baseColors,
    ...(isDefaultTheme ? {} : {
      bg: chatTheme.bg,
      card: chatTheme.card,
      sidebar: chatTheme.sidebar ?? chatTheme.card,
      border: chatTheme.border,
      input: chatTheme.input,
      inputBorder: chatTheme.inputBorder,
      text: chatTheme.text,
      textMuted: chatTheme.textMuted,
      subBg: chatTheme.sidebar ?? chatTheme.card,
    }),
  }

  const myBubble = chatTheme.myBubble || '#6366f1'
  const myBubbleText = chatTheme.myText || '#ffffff'
  const theirBubble = isDefaultTheme ? (isDark ? '#1e293b' : '#f1f5f9') : chatTheme.theirBubble
  const theirBubbleText = isDefaultTheme ? baseColors.text : chatTheme.theirText
  const chatFont = chatTheme.font
  const bubbleRadius = chatTheme.bubbleRadius ?? '16px'

  const accent = isDefaultTheme ? '#6366f1'
    : myBubble.startsWith('linear') ? (chatTheme.inputBorder || chatTheme.text || '#6366f1')
    : myBubble
  const accentText = myBubbleText

  const headerTextColor = !isDefaultTheme && chatTheme.headerText ? chatTheme.headerText : colors.text
  const headerMutedColor = !isDefaultTheme && chatTheme.headerText ? `${chatTheme.headerText}aa` : colors.textMuted

  const ghostBg = isDefaultTheme ? (isDark ? '#1e293b' : '#f1f5f9') : chatTheme.input
  const ghostBorder = isDefaultTheme ? colors.border : chatTheme.inputBorder
  const ghostText = isDefaultTheme ? colors.textMuted : chatTheme.textMuted

  const activeConvBg = isDefaultTheme
    ? (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)')
    : `${accent}22`

  const avatarBg = isDefaultTheme
    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
    : (myBubble.startsWith('linear') ? myBubble : accent)
  const avatarIsGradient = avatarBg.startsWith('linear')

  const inputBg = isDefaultTheme ? (isDark ? '#1e293b' : '#f1f5f9') : chatTheme.input
  const inputRadius = chatTheme.inputRadius ?? '12px'

  const queryClient = useQueryClient()

  const activeConvId = useChatStore(s => s.activeConvId)
  const setActiveConvId = useChatStore(s => s.setActiveConvId)
  const setCallSnapshot = useChatStore(s => s.setCallSnapshot)

  const [message, setMessage] = useState('')
  const [searchUsers, setSearchUsers] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [reportModal, setReportModal] = useState<{ messageId: string } | null>(null)
  const [reportReason, setReportReason] = useState('')

  // ── Voice call state ─────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>('idle')
  const [callPeer, setCallPeer] = useState<{ userId: string; userName: string } | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [callStats, setCallStats] = useState<{
    rttMs: number | null; packetLossPct: number | null; jitterMs: number | null; bitrateKbps: number | null
  } | null>(null)

  const callStateRef = useRef<CallState>('idle')
  callStateRef.current = callState
  const callPeerRef = useRef<{ userId: string; userName: string } | null>(null)
  callPeerRef.current = callPeer

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null)
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
  const callStatsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevBytesRef = useRef<number>(0)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeConvIdRef = useRef<string | null>(null)
  activeConvIdRef.current = activeConvId
  const otherUserRef = useRef<{ id: string; firstName: string; lastName: string } | undefined>(undefined)

  // ── cleanupCall ──────────────────────────────────────────────────
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
    if (callStatsIntervalRef.current) { clearInterval(callStatsIntervalRef.current); callStatsIntervalRef.current = null }
    prevBytesRef.current = 0
    setCallStats(null)
    setCallState('idle')
    setCallPeer(null)
    setCallDuration(0)
    setIsMuted(false)
    setIsScreenSharing(false)
    setIsRemoteScreenSharing(false)
  }, [])

  const cleanupCallRef = useRef(cleanupCall)
  cleanupCallRef.current = cleanupCall

  // ── Queries ──────────────────────────────────────────────────────

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: queryKeys.chat.conversations,
    queryFn: () => api.get('/chat/conversations').then(r => r.data),
    refetchInterval: 30000,
  })

  const {
    data: messagesInfinite,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
  } = useInfiniteQuery<MsgPage>({
    queryKey: queryKeys.chat.messages(activeConvId || ''),
    queryFn: ({ pageParam }) =>
      api.get(`/chat/conversations/${activeConvId}/messages?page=${pageParam}&limit=50`).then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    getPreviousPageParam: (firstPage: MsgPage) =>
      firstPage.page < firstPage.totalPages ? firstPage.page + 1 : undefined,
    enabled: !!activeConvId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  // pages[0] = page1 (newest 50, ascending). fetchPreviousPage prepends older pages.
  // flatMap gives: [older_pages..., newest_page] = chronological order.
  const messages = messagesInfinite?.pages.flatMap(p => p.messages) ?? []

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

  const editMutation = useMutation({
    mutationFn: ({ convId, msgId, content }: { convId: string; msgId: string; content: string }) =>
      api.patch(`/chat/conversations/${convId}/messages/${msgId}`, { content }).then(r => r.data),
    onError: () => toast.error('Failed to edit message'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ convId, msgId }: { convId: string; msgId: string }) =>
      api.delete(`/chat/conversations/${convId}/messages/${msgId}`).then(r => r.data),
    onError: () => toast.error('Failed to delete message'),
  })

  const reportMutation = useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: string }) =>
      api.post('/moderation/reports', { messageId, reason }),
    onSuccess: () => {
      toast.success('Message reported')
      setReportModal(null)
      setReportReason('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to report'),
  })

  // ── Helpers for cache updates ────────────────────────────────────

  const appendMessageToCache = useCallback((convId: string, msg: ChatMessage) => {
    queryClient.setQueryData<InfiniteData<MsgPage>>(
      queryKeys.chat.messages(convId),
      (old) => {
        if (!old?.pages.length) return old
        const pages = [...old.pages]
        const last = pages[pages.length - 1]
        pages[pages.length - 1] = { ...last, messages: [...last.messages, msg] }
        return { ...old, pages }
      },
    )
  }, [queryClient])

  // ── Effects ──────────────────────────────────────────────────────

  useEffect(() => {
    setCallSnapshot(callState, callPeer, callDuration)
  }, [callState, callPeer, callDuration, setCallSnapshot])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (callStateRef.current !== 'idle') { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Socket (registered once on mount) ───────────────────────────
  useEffect(() => {
    const socket = connectChatSocket()

    socket.on('connect', () => {
      const convId = activeConvIdRef.current
      if (convId) {
        socket.emit('join_conversation', convId)
        socket.emit('mark_read', convId)
      }
    })

    socket.on('online_users_list', (data: { userIds: string[] }) => {
      setOnlineUsers(new Set(data.userIds))
    })
    socket.on('user_online', (data: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId))
    })
    socket.on('user_offline', (data: { userId: string }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(data.userId); return s })
    })

    socket.on('new_message', (msg: ChatMessage) => {
      const convId = msg.conversationId ?? activeConvIdRef.current ?? ''
      // Append to newest page (last in pages array)
      queryClient.setQueryData<InfiniteData<MsgPage>>(
        queryKeys.chat.messages(convId),
        (old) => {
          if (!old?.pages.length) return old
          const pages = [...old.pages]
          const last = pages[pages.length - 1]
          pages[pages.length - 1] = { ...last, messages: [...last.messages, msg] }
          return { ...old, pages }
        },
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    })

    socket.on('conversation_updated', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    })

    socket.on('message_updated', (updated: ChatMessage) => {
      if (!activeConvIdRef.current) return
      queryClient.setQueryData<InfiniteData<MsgPage>>(
        queryKeys.chat.messages(updated.conversationId ?? activeConvIdRef.current),
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.map(m => m.id === updated.id ? updated : m),
            })),
          }
        },
      )
    })

    socket.on('message_deleted', (data: { id: string; conversationId: string; deletedAt: string }) => {
      queryClient.setQueryData<InfiniteData<MsgPage>>(
        queryKeys.chat.messages(data.conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.map(m =>
                m.id === data.id ? { ...m, deletedAt: data.deletedAt } : m
              ),
            })),
          }
        },
      )
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
        startStatsPolling()
      } catch { /* ignore */ }
    })

    socket.on('call_rejected', () => {
      toast('Call was declined', { icon: '📵' })
      cleanupCallRef.current()
    })

    socket.on('call_ended', () => {
      if (callStateRef.current !== 'idle') cleanupCallRef.current()
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

    return () => { socket.removeAllListeners() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const socket = getChatSocket()
    if (!socket || !activeConvId) return
    socket.emit('join_conversation', activeConvId)
    socket.emit('mark_read', activeConvId)
    return () => { socket.emit('leave_conversation', activeConvId) }
  }, [activeConvId])

  useEffect(() => {
    return () => { cleanupCallRef.current() }
  }, [])

  // ── WebRTC stats ─────────────────────────────────────────────────
  const startStatsPolling = useCallback(() => {
    if (callStatsIntervalRef.current) clearInterval(callStatsIntervalRef.current)
    prevBytesRef.current = 0
    callStatsIntervalRef.current = setInterval(async () => {
      const pc = peerConnectionRef.current
      if (!pc) return
      try {
        const reports = await pc.getStats()
        let rttMs: number | null = null
        let packetLossPct: number | null = null
        let jitterMs: number | null = null
        let bytesReceived = 0
        reports.forEach((report) => {
          if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
            if (report.roundTripTime != null) rttMs = Math.round(report.roundTripTime * 1000)
            if (report.fractionLost != null) packetLossPct = Math.round(report.fractionLost * 100)
            if (report.jitter != null) jitterMs = Math.round(report.jitter * 1000)
          }
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            if (report.jitter != null) jitterMs = jitterMs ?? Math.round(report.jitter * 1000)
            if (report.bytesReceived != null) bytesReceived = report.bytesReceived
          }
        })
        const prevBytes = prevBytesRef.current
        const bitrateKbps = prevBytes > 0 ? Math.round(((bytesReceived - prevBytes) * 8) / 2000) : null
        prevBytesRef.current = bytesReceived
        setCallStats({ rttMs, packetLossPct, jitterMs, bitrateKbps })
      } catch { /* ignore */ }
    }, 2000)
  }, [])

  // ── WebRTC handlers ──────────────────────────────────────────────

  const buildPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc
    pc.onicecandidate = (e) => {
      if (e.candidate) getChatSocket()?.emit('ice_candidate', { targetUserId, candidate: e.candidate.toJSON() })
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
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) cleanupCallRef.current()
    }
    return pc
  }, [])

  const startCall = useCallback(async () => {
    const convId = activeConvIdRef.current
    const target = otherUserRef.current
    if (!convId) { toast.error('No conversation selected'); return }
    if (callStateRef.current !== 'idle') { toast.error('Already in a call'); return }
    if (!target) { toast.error('Could not find the other user'); return }
    const socket = getChatSocket()
    if (!socket?.connected) { toast.error('Chat connection lost — please refresh the page'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      const pc = buildPeerConnection(target.id)
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('call_offer', { conversationId: convId, offer, targetUserId: target.id })
      setCallState('calling')
      setCallPeer({ userId: target.id, userName: `${target.firstName} ${target.lastName}` })
      startCallingTone()
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
      for (const c of iceCandidateQueueRef.current) await pc.addIceCandidate(c).catch(() => {})
      iceCandidateQueueRef.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      getChatSocket()?.emit('call_answer', { targetUserId: incoming.from.userId, answer })
      setCallState('active')
      callStartRef.current = Date.now()
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000))
      }, 1000)
      startStatsPolling()
    } catch {
      toast.error('Could not access microphone')
      rejectCall()
    }
  }, [buildPeerConnection, startStatsPolling]) // eslint-disable-line react-hooks/exhaustive-deps

  const rejectCall = useCallback(() => {
    const incoming = incomingCallRef.current
    if (incoming) getChatSocket()?.emit('call_reject', { targetUserId: incoming.from.userId })
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
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled) }
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

  // ── Message handlers ─────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!activeConvId || !message.trim()) return
    const text = message.trim()
    setMessage('')
    try {
      const { data: newMsg } = await api.post(`/chat/conversations/${activeConvId}/messages`, {
        content: text, type: 'TEXT',
      })
      appendMessageToCache(activeConvId, newMsg)
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
      getChatSocket()?.emit('stop_typing', activeConvId)
    } catch {
      setMessage(text)
      toast.error('Failed to send message')
    }
  }, [activeConvId, message, queryClient, appendMessageToCache])

  // Debounced typing: emit once per burst, not every keystroke
  const handleTyping = useCallback(() => {
    const socket = getChatSocket()
    if (!socket || !activeConvId) return
    if (!typingTimeoutRef.current) socket.emit('typing', activeConvId)
    clearTimeout(typingTimeoutRef.current ?? undefined)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', activeConvId)
      typingTimeoutRef.current = null
    }, 2000)
  }, [activeConvId])

  const handleSendVoice = useCallback(async (blob: Blob, duration: number) => {
    if (!activeConvId) return
    const formData = new FormData()
    formData.append('audio', blob, 'voice.webm')
    const { data: uploadResult } = await api.post('/chat/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const { data: newMsg } = await api.post(`/chat/conversations/${activeConvId}/messages`, {
      type: 'VOICE', audioUrl: uploadResult.key, audioDuration: duration,
    })
    appendMessageToCache(activeConvId, newMsg)
    queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
  }, [activeConvId, queryClient, appendMessageToCache])

  // ── Helpers ──────────────────────────────────────────────────────

  const getOtherUser = (conv: Conversation) =>
    conv.participants.find(p => p.userId !== user?.id)?.user

  const activeConversation = conversations.find(c => c.id === activeConvId)
  const otherUser = activeConversation ? getOtherUser(activeConversation) : null
  otherUserRef.current = otherUser ?? undefined

  const otherLastRead = activeConversation?.participants.find(p => p.userId !== user?.id)?.lastReadAt

  const showList = isMobile ? !activeConvId : true
  const showChat = isMobile ? !!activeConvId : true

  // ── PRO gate ──────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: '100%', fontFamily: chatFont,
      backgroundColor: colors.bg, overflow: 'hidden', position: 'relative',
    }}>
      {/* Hidden remote audio */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {/* Scanlines overlay */}
      {chatTheme.scanlines && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9000,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)',
        }} />
      )}

      {/* Call overlays (fullscreen + incoming card) */}
      <CallOverlay
        callState={callState}
        callPeer={callPeer}
        callDuration={callDuration}
        isMuted={isMuted}
        isScreenSharing={isScreenSharing}
        isRemoteScreenSharing={isRemoteScreenSharing}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        callStats={callStats}
        remoteScreenVideoRef={remoteScreenVideoRef}
        onToggleMute={toggleMute}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onHangUp={hangUp}
        onAnswerCall={answerCall}
        onRejectCall={rejectCall}
        colors={colors}
        accent={accent}
        accentText={accentText}
        avatarBg={avatarBg}
        avatarIsGradient={avatarIsGradient}
        inputRadius={inputRadius}
        chatFont={chatFont}
      />

      {/* Conversation sidebar */}
      {showList && (
        <ConversationSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          onSelectConv={setActiveConvId}
          onlineUsers={onlineUsers}
          currentUserId={user?.id ?? ''}
          showNewChat={showNewChat}
          setShowNewChat={setShowNewChat}
          searchUsers={searchUsers}
          setSearchUsers={setSearchUsers}
          chatUsers={chatUsers}
          onStartConversation={(userId) => startConvMutation.mutate(userId)}
          isMobile={isMobile}
          colors={colors}
          accent={accent}
          accentText={accentText}
          avatarBg={avatarBg}
          avatarIsGradient={avatarIsGradient}
          activeConvBg={activeConvBg}
          chatFont={chatFont}
          inputRadius={inputRadius}
          borderStyle={chatTheme.borderStyle}
          themeBorder={chatTheme.border}
        />
      )}

      {/* Message area */}
      {showChat && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {!activeConvId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: colors.textMuted }}>
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '16px' }}>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* ── Chat Header ── */}
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 20px', borderBottom: `1px solid ${colors.border}`,
                background: !isDefaultTheme && chatTheme.header.startsWith('linear') ? chatTheme.header : undefined,
                backgroundColor: !isDefaultTheme && !chatTheme.header.startsWith('linear')
                  ? chatTheme.header : (isDefaultTheme ? colors.card : undefined),
                flexShrink: 0,
              }}>
                {isMobile && (
                  <button onClick={() => setActiveConvId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: headerTextColor, padding: 0 }}>
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: !isDefaultTheme && chatTheme.headerText ? undefined : (avatarIsGradient ? avatarBg : undefined),
                  backgroundColor: !isDefaultTheme && chatTheme.headerText ? chatTheme.headerText : (avatarIsGradient ? undefined : accent),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700',
                  color: !isDefaultTheme && chatTheme.headerText ? (chatTheme.header.startsWith('linear') ? '#ffffff' : chatTheme.header) : accentText,
                }}>
                  {otherUser?.firstName[0]}{otherUser?.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: headerTextColor }}>
                    {otherUser?.firstName} {otherUser?.lastName}
                  </p>
                  {typingUser ? (
                    <p style={{ fontSize: '11px', color: headerMutedColor, margin: 0, fontWeight: '500' }}>typing...</p>
                  ) : otherUser && onlineUsers.has(otherUser.id) ? (
                    <p style={{ fontSize: '11px', color: headerMutedColor, margin: 0, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: headerTextColor, display: 'inline-block' }} />
                      Online
                    </p>
                  ) : (
                    <p style={{ fontSize: '11px', color: headerMutedColor, margin: 0 }}>
                      {otherUser?.lastSeenAt
                        ? `Last seen ${new Date(otherUser.lastSeenAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : 'Offline'}
                    </p>
                  )}
                </div>

                {callState === 'idle' && (
                  <button onClick={startCall} style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                    backgroundColor: !isDefaultTheme ? `${headerTextColor}22` : ghostBg,
                    color: headerTextColor, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }} title="Start voice call">
                    <Phone size={17} />
                  </button>
                )}

                {(callState === 'calling' || callState === 'active') && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: callState === 'active' ? '#16a34a' : ghostBg,
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px',
                    borderBottom: callState === 'calling' ? `1px solid ${colors.border}` : 'none',
                  }}>
                    {callState === 'calling' ? (
                      <>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: accent, display: 'inline-block', animation: 'callDotPulse 1s infinite' }} />
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: colors.text }}>
                          Calling {callPeer?.userName}...
                        </span>
                        <button onClick={hangUp} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cancel">
                          <PhoneOff size={17} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Phone size={17} style={{ color: '#fff', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                          {callPeer?.userName} · {formatDuration(callDuration)}
                        </span>
                        {callStats && (() => {
                          const rtt = callStats.rttMs ?? 999
                          const loss = callStats.packetLossPct ?? 0
                          const quality = rtt < 80 && loss < 2 ? 'good' : rtt < 200 && loss < 10 ? 'fair' : 'poor'
                          const color = quality === 'good' ? '#4ade80' : quality === 'fair' ? '#fbbf24' : '#f87171'
                          const label = quality === 'good' ? 'Good' : quality === 'fair' ? 'Fair' : 'Poor'
                          return (
                            <span title={`Latency: ${callStats.rttMs ?? '?'}ms · Loss: ${callStats.packetLossPct ?? '?'}% · Jitter: ${callStats.jitterMs ?? '?'}ms`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color, cursor: 'default', flexShrink: 0 }}>
                              <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                                <rect x="0" y="8" width="3" height="4" rx="1" fill={color} opacity={1} />
                                <rect x="4" y="5" width="3" height="7" rx="1" fill={color} opacity={quality !== 'poor' ? 1 : 0.3} />
                                <rect x="8" y="2" width="3" height="10" rx="1" fill={color} opacity={quality === 'good' ? 1 : 0.3} />
                                <rect x="12" y="0" width="2" height="12" rx="1" fill={color} opacity={quality === 'good' ? 1 : 0.15} />
                              </svg>
                              {label}
                            </span>
                          )
                        })()}
                        <button onClick={toggleMute} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isMuted ? 'Unmute' : 'Mute'}>
                          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: isScreenSharing ? '#f59e0b' : 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
                          <Monitor size={16} />
                        </button>
                        <button onClick={() => setIsFullscreen(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Fullscreen">
                          <Maximize2 size={16} />
                        </button>
                        <button onClick={hangUp} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="End call">
                          <PhoneOff size={17} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Remote screen share panel */}
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
                  <Monitor size={11} /> {callPeer?.userName} is sharing their screen
                </div>
              </div>

              {/* Message list with infinite scroll */}
              <MessageList
                messages={messages}
                currentUserId={user?.id ?? ''}
                otherLastRead={otherLastRead}
                onReport={(messageId) => { setReportModal({ messageId }); setReportReason('') }}
                onEditSave={(msgId, content) => {
                  if (activeConvId) editMutation.mutate({ convId: activeConvId, msgId, content })
                }}
                onDelete={(msgId) => {
                  if (activeConvId) deleteMutation.mutate({ convId: activeConvId, msgId })
                }}
                fetchPreviousPage={fetchPreviousPage}
                hasPreviousPage={hasPreviousPage ?? false}
                isFetchingPreviousPage={isFetchingPreviousPage}
                isDark={isDark}
                isDefaultTheme={isDefaultTheme}
                myBubble={myBubble}
                myBubbleText={myBubbleText}
                theirBubble={theirBubble ?? (isDark ? '#1e293b' : '#f1f5f9')}
                theirBubbleText={theirBubbleText ?? colors.text}
                chatFont={chatFont}
                bubbleRadius={bubbleRadius}
                accent={accent}
                colors={colors}
                chatThemeBorderStyle={chatTheme.borderStyle}
                chatThemeBorder={chatTheme.border}
              />

              {/* Message input */}
              <MessageInput
                message={message}
                setMessage={setMessage}
                onSend={sendMessage}
                onTyping={handleTyping}
                onSendVoice={handleSendVoice}
                colors={colors}
                accent={accent}
                accentText={accentText}
                inputBg={inputBg}
                inputRadius={inputRadius}
                ghostBg={ghostBg}
                ghostBorder={ghostBorder}
                ghostText={ghostText}
                chatFont={chatFont}
              />
            </>
          )}
        </div>
      )}

      {/* Report message modal */}
      {reportModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setReportModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: colors.card, borderRadius: '16px',
            border: `1px solid ${colors.border}`, padding: '24px',
            width: '100%', maxWidth: '400px', margin: '0 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Flag size={18} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.text }}>Report Message</h3>
            </div>
            <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '16px' }}>
              Let us know why this message is inappropriate. Admins will review your report.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {['Spam', 'Harassment', 'Hate speech', 'Inappropriate content', 'Other'].map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', backgroundColor: reportReason === r ? `${accent}15` : 'transparent', border: `1px solid ${reportReason === r ? accent : colors.border}` }}>
                  <input type="radio" name="reason" value={r} checked={reportReason === r} onChange={() => setReportReason(r)} style={{ accentColor: accent }} />
                  <span style={{ fontSize: '13px', color: colors.text }}>{r}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setReportModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border}`, backgroundColor: 'transparent', color: colors.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                Cancel
              </button>
              <button
                onClick={() => reportReason && reportMutation.mutate({ messageId: reportModal.messageId, reason: reportReason })}
                disabled={!reportReason || reportMutation.isPending}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: reportReason ? '#ef4444' : colors.border, color: reportReason ? '#fff' : colors.textMuted, cursor: reportReason ? 'pointer' : 'default', fontSize: '13px', fontWeight: '600' }}
              >
                {reportMutation.isPending ? 'Reporting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
