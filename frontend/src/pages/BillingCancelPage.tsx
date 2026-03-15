import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '../store/themeStore'
import { XCircle } from 'lucide-react'

export default function BillingCancelPage() {
  const navigate = useNavigate()
  const { isDark } = useThemeStore()

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
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <XCircle size={32} color="#ef4444" />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: colors.text, margin: '0 0 8px' }}>Checkout cancelled</h1>
        <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 24px' }}>
          No worries — you haven't been charged. You can upgrade anytime.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/app/billing')}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            Try again
          </button>
          <button
            onClick={() => navigate('/app/dashboard')}
            style={{ padding: '10px 20px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
          >
            Back to app
          </button>
        </div>
      </div>
    </div>
  )
}
