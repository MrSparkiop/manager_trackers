import { useState, useRef } from 'react'
import { Send, Mic, Square, Play, Pause, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  message: string
  setMessage: (s: string) => void
  onSend: () => void
  onTyping: () => void
  onSendVoice: (blob: Blob, duration: number) => Promise<void>
  colors: Record<string, string>
  accent: string
  accentText: string
  inputBg: string
  inputRadius: string
  ghostBg: string
  ghostBorder: string
  ghostText: string
  chatFont: string
}

export function MessageInput({
  message, setMessage, onSend, onTyping, onSendVoice,
  colors, accent, accentText, inputBg, inputRadius,
  ghostBg, ghostBorder, ghostText, chatFont,
}: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSendingVoice, setIsSendingVoice] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartRef = useRef<number>(0)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

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
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false) }

  const cancelRecording = () => {
    setAudioBlob(null)
    setAudioDuration(0)
    setIsPlaying(false)
  }

  const handleSendVoice = async () => {
    if (!audioBlob || isSendingVoice) return
    setIsSendingVoice(true)
    try {
      await onSendVoice(audioBlob, audioDuration)
      cancelRecording()
    } finally {
      setIsSendingVoice(false)
    }
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

  return (
    <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.card, flexShrink: 0 }}>
      {/* Voice preview bar */}
      {audioBlob && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px',
          padding: '10px 14px', borderRadius: inputRadius,
          backgroundColor: ghostBg, border: `1px solid ${colors.border}`,
        }}>
          <button onClick={playPreview} style={{
            width: '32px', height: '32px', borderRadius: '50%', border: 'none',
            backgroundColor: accent, color: accentText, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ height: '4px', backgroundColor: colors.border, borderRadius: '999px' }}>
              <div style={{ height: '100%', width: '100%', backgroundColor: accent, borderRadius: '999px' }} />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '500' }}>{audioDuration}s</span>
          <button onClick={cancelRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '2px' }}>
            <X size={16} />
          </button>
          <button
            onClick={handleSendVoice}
            disabled={isSendingVoice}
            style={{
              backgroundColor: accent, color: accentText, border: 'none',
              borderRadius: '8px', padding: '6px 14px', fontSize: '12px',
              fontWeight: '600', cursor: isSendingVoice ? 'default' : 'pointer',
              opacity: isSendingVoice ? 0.7 : 1,
            }}
          >
            {isSendingVoice ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}

      {/* Text + mic row */}
      {!audioBlob && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            value={message}
            onChange={e => { setMessage(e.target.value); onTyping() }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Type a message..."
            style={{
              flex: 1, backgroundColor: inputBg,
              border: `1px solid ${ghostBorder}`, borderRadius: inputRadius,
              padding: '10px 14px', color: colors.text, fontSize: '14px', outline: 'none',
              fontFamily: chatFont,
            }}
          />
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: isRecording ? '#ef4444' : ghostBg,
              color: isRecording ? '#fff' : ghostText,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              border: isRecording ? 'none' : `1px solid ${ghostBorder}`,
            }}
            title={isRecording ? 'Stop recording' : 'Record voice message'}
          >
            {isRecording ? <Square size={16} fill="#fff" /> : <Mic size={18} />}
          </button>
          {message.trim() && (
            <button onClick={onSend} style={{
              width: '40px', height: '40px', borderRadius: '50%', border: 'none',
              backgroundColor: accent, color: accentText, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Send size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
