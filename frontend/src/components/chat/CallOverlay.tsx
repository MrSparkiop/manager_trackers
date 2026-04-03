import { Mic, MicOff, Monitor, PhoneOff, PhoneCall, Minimize2 } from 'lucide-react'

export type CallState = 'idle' | 'calling' | 'ringing' | 'active'

interface CallStats {
  rttMs: number | null
  packetLossPct: number | null
  jitterMs: number | null
  bitrateKbps: number | null
}

interface Props {
  callState: CallState
  callPeer: { userId: string; userName: string } | null
  callDuration: number
  isMuted: boolean
  isScreenSharing: boolean
  isRemoteScreenSharing: boolean
  isFullscreen: boolean
  setIsFullscreen: (b: boolean) => void
  callStats: CallStats | null
  remoteScreenVideoRef: React.RefObject<HTMLVideoElement>
  onToggleMute: () => void
  onStartScreenShare: () => void
  onStopScreenShare: () => void
  onHangUp: () => void
  onAnswerCall: () => void
  onRejectCall: () => void
  // Visual
  colors: Record<string, string>
  accent: string
  accentText: string
  avatarBg: string
  avatarIsGradient: boolean
  inputRadius: string
  chatFont: string
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function CallOverlay({
  callState, callPeer, callDuration, isMuted, isScreenSharing,
  isRemoteScreenSharing, isFullscreen, setIsFullscreen, callStats,
  remoteScreenVideoRef,
  onToggleMute, onStartScreenShare, onStopScreenShare, onHangUp,
  onAnswerCall, onRejectCall,
  colors, accent, accentText, avatarBg, avatarIsGradient, inputRadius, chatFont,
}: Props) {
  return (
    <>
      {/* ── Fullscreen active call overlay ────────────────── */}
      {isFullscreen && callState === 'active' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '24px', fontFamily: 'Inter, sans-serif',
        }}>
          <button onClick={() => setIsFullscreen(false)} style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: '44px', height: '44px', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Exit fullscreen">
            <Minimize2 size={20} />
          </button>

          {isRemoteScreenSharing && (
            <div style={{
              position: 'absolute', inset: '80px 0 160px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#000',
            }}>
              <video
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                ref={el => {
                  if (el && remoteScreenVideoRef.current?.srcObject) {
                    el.srcObject = remoteScreenVideoRef.current.srcObject
                  }
                }}
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
              <p style={{ fontSize: '18px', opacity: 0.8, fontVariantNumeric: 'tabular-nums', marginBottom: '12px' }}>
                {formatDuration(callDuration)}
              </p>
              {callStats && (() => {
                const rtt = callStats.rttMs ?? 999
                const loss = callStats.packetLossPct ?? 0
                const quality = rtt < 80 && loss < 2 ? 'good' : rtt < 200 && loss < 10 ? 'fair' : 'poor'
                const qColor = quality === 'good' ? '#4ade80' : quality === 'fair' ? '#fbbf24' : '#f87171'
                return (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                      { label: 'Latency', value: callStats.rttMs != null ? `${callStats.rttMs}ms` : '—' },
                      { label: 'Packet loss', value: callStats.packetLossPct != null ? `${callStats.packetLossPct}%` : '—' },
                      { label: 'Jitter', value: callStats.jitterMs != null ? `${callStats.jitterMs}ms` : '—' },
                      { label: 'Bitrate', value: callStats.bitrateKbps != null ? `${callStats.bitrateKbps} kbps` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: label === 'Latency' ? qColor : 'rgba(255,255,255,0.9)' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button onClick={onToggleMute} style={{
              width: '60px', height: '60px', borderRadius: '50%', border: 'none',
              backgroundColor: isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare} style={{
              width: '60px', height: '60px', borderRadius: '50%', border: 'none',
              backgroundColor: isScreenSharing ? '#f59e0b' : 'rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
              <Monitor size={22} />
            </button>
            <button onClick={() => { onHangUp(); setIsFullscreen(false) }} style={{
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

      {/* ── Incoming call card (fixed, top-right) ─────────── */}
      {callState === 'ringing' && callPeer && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 1000,
          backgroundColor: colors.card,
          borderRadius: inputRadius,
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          width: '270px',
          border: `1px solid ${colors.border}`,
          fontFamily: chatFont,
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                backgroundColor: 'rgba(34,197,94,0.15)',
                animation: 'callRingPulse 1.5s infinite',
              }} />
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: avatarIsGradient ? avatarBg : undefined,
                backgroundColor: avatarIsGradient ? undefined : accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: '700', color: accentText,
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
            <button onClick={onRejectCall} style={{
              width: '52px', height: '52px', borderRadius: '50%', border: 'none',
              backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title="Decline">
              <PhoneOff size={22} />
            </button>
            <button onClick={onAnswerCall} style={{
              width: '52px', height: '52px', borderRadius: '50%', border: 'none',
              backgroundColor: '#22c55e', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title="Accept">
              <PhoneCall size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
