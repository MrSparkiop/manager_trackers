import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { CheckCircle } from 'lucide-react'

export default function BillingSuccessPage() {
  const navigate = useNavigate()
  const { isDark } = useThemeStore()
  const { fetchMe } = useAuthStore()

  // Refresh user so role becomes PRO immediately
  useEffect(() => {
    fetchMe()
    const t = setTimeout(() => navigate('/app/billing'), 4000)
    return () => clearTimeout(t)
  }, [])

  const colors = {
    bg:   isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '48px 40px', textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={32} color="#22c55e" />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: colors.text, margin: '0 0 8px' }}>You're now Pro! ✨</h1>
        <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 24px' }}>
          Your subscription is active. Enjoy unlimited projects, tasks, and teams.
        </p>
        <p style={{ fontSize: '13px', color: colors.textMuted }}>Redirecting you back in a moment…</p>
        <button
          onClick={() => navigate('/app/billing')}
          style={{ marginTop: '20px', padding: '10px 24px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          Go to Billing
        </button>
      </div>
    </div>
  )
}
