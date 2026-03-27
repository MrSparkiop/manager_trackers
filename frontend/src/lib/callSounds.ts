/**
 * Call sound effects using Web Audio API — no external files needed.
 * Generates ringtone, calling tone, and end-call beep programmatically.
 */

let audioCtx: AudioContext | null = null

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// ── Ringtone: two-tone "ring ring" pattern, loops ────────────────

let ringtoneInterval: ReturnType<typeof setInterval> | null = null

function playRingBurst() {
  const ctx = getCtx()
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

  // First tone
  const osc1 = ctx.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(440, now)
  osc1.connect(gain)
  osc1.start(now)
  osc1.stop(now + 0.3)

  // Second tone (slightly higher)
  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(520, now + 0.35)
  osc2.connect(gain)
  osc2.start(now + 0.35)
  osc2.stop(now + 0.65)
}

export function startRingtone() {
  stopRingtone()
  playRingBurst()
  ringtoneInterval = setInterval(playRingBurst, 2000) // ring every 2s
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval)
    ringtoneInterval = null
  }
}

// ── Calling tone: soft periodic beep while waiting ───────────────

let callingInterval: ReturnType<typeof setInterval> | null = null

function playCallingBeep() {
  const ctx = getCtx()
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(425, now) // standard ringback tone
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + 0.8)
}

export function startCallingTone() {
  stopCallingTone()
  playCallingBeep()
  callingInterval = setInterval(playCallingBeep, 3000) // beep every 3s
}

export function stopCallingTone() {
  if (callingInterval) {
    clearInterval(callingInterval)
    callingInterval = null
  }
}

// ── End-call beep: short descending tone ─────────────────────────

export function playEndCallTone() {
  const ctx = getCtx()
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0.12, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(480, now)
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.4)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + 0.5)
}

// ── Stop everything ──────────────────────────────────────────────

export function stopAllCallSounds() {
  stopRingtone()
  stopCallingTone()
}
