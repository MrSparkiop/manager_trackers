import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Timer, CheckSquare, BarChart3, Calendar } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const features = [
  { icon: CheckSquare, text: 'Track tasks & projects' },
  { icon: Timer,       text: 'Built-in time tracker' },
  { icon: BarChart3,   text: 'Progress analytics' },
  { icon: Calendar,    text: 'Calendar & scheduling' },
]

export default function RegisterPage() {
  const [form, setForm]         = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { register }            = useAuthStore()
  const navigate                = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.email, form.password, form.firstName, form.lastName)
      navigate('/app/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155',
    borderRadius: '10px', padding: '12px 16px', color: '#ffffff',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: '600',
    color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.03em'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#030712',
    }}>
      {/* Left Panel - Branding */}
      <div
        className="auth-left-panel"
        style={{
          flex: 1, display: 'none',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)',
          padding: '48px', flexDirection: 'column', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Background circles */}
        <div style={{
          position: 'absolute', width: '400px', height: '400px',
          borderRadius: '50%', background: 'rgba(99,102,241,0.15)',
          top: '-100px', right: '-100px', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', width: '300px', height: '300px',
          borderRadius: '50%', background: 'rgba(139,92,246,0.1)',
          bottom: '-50px', left: '-50px', pointerEvents: 'none'
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div style={{
            width: '42px', height: '42px', backgroundColor: '#6366f1',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Timer size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: 0 }}>TrackFlow</h1>
            <p style={{ fontSize: '12px', color: '#818cf8', margin: 0 }}>Schedule Manager</p>
          </div>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', color: '#ffffff', margin: '0 0 16px', lineHeight: '1.2' }}>
            Start your journey<br />
            <span style={{ color: '#818cf8' }}>to peak productivity.</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', margin: '0 0 40px', lineHeight: '1.6' }}>
            Join TrackFlow and take control of your tasks, time and projects today.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {features.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '36px', height: '36px', backgroundColor: 'rgba(99,102,241,0.2)',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={16} color="#818cf8" />
                </div>
                <span style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: '500' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', position: 'relative' }}>
          © 2026 TrackFlow. Built for productivity.
        </p>
      </div>

      {/* Right Panel - Form */}
      <div style={{
        width: '100%', maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '52px', height: '52px', backgroundColor: '#6366f1',
              borderRadius: '14px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Timer size={24} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Create account
            </h1>
            <p style={{ color: '#64748b', marginTop: '8px', fontSize: '15px' }}>
              Start tracking your work for free
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', padding: '12px 16px', borderRadius: '10px',
              fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <div style={{
            backgroundColor: '#0f172a', borderRadius: '20px',
            padding: '32px', border: '1px solid #1e293b'
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>FIRST NAME</label>
                  <input
                    value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                    placeholder="John" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#334155'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>LAST NAME</label>
                  <input
                    value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Doe" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#334155'}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>EMAIL ADDRESS</label>
                <input
                  type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div>
                <label style={labelStyle}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 characters" required minLength={8}
                    style={{ ...inputStyle, padding: '12px 48px 12px 16px' }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#334155'}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                    display: 'flex', alignItems: 'center', padding: 0
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength */}
                {form.password.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '999px',
                          backgroundColor: i <= Math.min(Math.floor(form.password.length / 3), 4)
                            ? ['', '#f87171', '#facc15', '#60a5fa', '#4ade80'][Math.min(Math.floor(form.password.length / 3), 4)]
                            : '#1e293b',
                          transition: 'background-color 0.3s'
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      {form.password.length < 3 ? 'Too short' :
                       form.password.length < 6 ? 'Weak' :
                       form.password.length < 9 ? 'Good' : 'Strong'} password
                    </p>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px',
                background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff', fontWeight: '600', fontSize: '15px',
                borderRadius: '10px', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)'
              }}>
                {loading ? '⏳ Creating account...' : 'Create Account →'}
              </button>

              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', margin: 0 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600' }}>
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .auth-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}