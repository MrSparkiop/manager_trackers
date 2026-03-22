import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { FolderKanban, CheckSquare, Timer, ArrowRight, Check, Sparkles } from 'lucide-react'
import api from '../lib/axios'

const STEPS = [
  {
    icon: FolderKanban,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.15)',
    title: 'Create your first project',
    description: 'Projects help you organize related tasks together.',
    action: 'projects',
  },
  {
    icon: CheckSquare,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.15)',
    title: 'Add your first task',
    description: 'Break your work into actionable tasks with priorities and due dates.',
    action: 'tasks',
  },
  {
    icon: Timer,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.15)',
    title: 'Start tracking time',
    description: 'Use the built-in timer to see where your hours go.',
    action: 'time-tracker',
  },
] as const

export default function OnboardingModal() {
  const { isDark } = useThemeStore()
  const { fetchMe } = useAuthStore()
  const navigate = useNavigate()
  const [completing, setCompleting] = useState(false)

  const c = {
    bg: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    muted: isDark ? '#64748b' : '#94a3b8',
    subtle: isDark ? '#1e293b' : '#f8fafc',
  }

  const handleGo = (path: string) => {
    handleDismiss()
    navigate(`/app/${path}`)
  }

  const handleDismiss = async () => {
    setCompleting(true)
    try {
      await api.post('/auth/complete-onboarding')
      await fetchMe()
    } catch {
      // non-critical, just close
    }
    setCompleting(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: c.bg, borderRadius: '20px',
        border: `1px solid ${c.border}`, padding: '36px',
        maxWidth: '520px', width: '90%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: c.text, margin: '0 0 8px' }}>
            Welcome to TrackFlow!
          </h2>
          <p style={{ fontSize: '14px', color: c.muted, margin: 0, lineHeight: '1.5' }}>
            Get started in 3 quick steps. You can always come back to these later.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {STEPS.map((step, i) => (
            <button
              key={step.action}
              onClick={() => handleGo(step.action)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px', borderRadius: '14px',
                backgroundColor: c.subtle, border: `1px solid ${c.border}`,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = step.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = c.border}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                backgroundColor: step.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <step.icon size={20} color={step.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: c.text, margin: '0 0 2px' }}>
                  {i + 1}. {step.title}
                </p>
                <p style={{ fontSize: '12px', color: c.muted, margin: 0 }}>
                  {step.description}
                </p>
              </div>
              <ArrowRight size={16} color={c.muted} />
            </button>
          ))}
        </div>

        <button
          onClick={handleDismiss}
          disabled={completing}
          style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            backgroundColor: 'transparent', border: `1px solid ${c.border}`,
            color: c.muted, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
          }}
        >
          <Check size={14} />
          {completing ? 'Finishing...' : 'Skip for now'}
        </button>
      </div>
    </div>
  )
}
