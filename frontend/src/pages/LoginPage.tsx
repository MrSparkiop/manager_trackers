import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Timer, BarChart3, CheckSquare, Calendar } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const features = [
  { icon: CheckSquare, text: 'Track tasks & projects' },
  { icon: Timer,       text: 'Built-in time tracker' },
  { icon: BarChart3,   text: 'Progress analytics' },
  { icon: Calendar,    text: 'Calendar & scheduling' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuthStore()
  const navigate                = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app/dashboard')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#030712',
    }}>
      {/* Left Panel */}
      <div className="auth-left-panel" style={{
        flex: 1, display: 'none',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)',
        padding: '48px', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
          background: 'rgba(99,102,241,0.15)', top: '-100px', right: '-100px', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
          background: 'rgba(139,92,246,0.1)', bottom: '-50px', left: '-50px', pointerEvents: 'none'
        }} />

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

        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', color: '#ffffff', margin: '0 0 16px', lineHeight: '1.2' }}>
            Manage your work<br />
            <span style={{ color: '#818cf8' }}>smarter, not harder.</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', margin: '0 0 40px', lineHeight: '1.6' }}>
            Everything you need to stay organized, focused, and productive in one place.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {features.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '36px', height: '36px', backgroundColor: 'rgba(99,102,241,0.2)',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
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

      {/* Right Panel */}
      <div style={{
        width: '100%', maxWidth: '480px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              width: '52px', height: '52px', backgroundColor: '#6366f1',
              borderRadius: '14px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Timer size={24} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748b', marginTop: '8px', fontSize: '15px' }}>
              Sign in to your TrackFlow account
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', padding: '12px 16px', borderRadius: '10px',
              fontSize: '14px', marginBottom: '20px'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{
            backgroundColor: '#0f172a', borderRadius: '20px',
            padding: '32px', border: '1px solid #1e293b'
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.03em' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  style={{
                    width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155',
                    borderRadius: '10px', padding: '12px 16px', color: '#ffffff',
                    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.03em' }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={{
                      width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155',
                      borderRadius: '10px', padding: '12px 48px 12px 16px', color: '#ffffff',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#334155'}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                    display: 'flex', alignItems: 'center', padding: 0, zIndex: 2
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot password — completely outside form fields, plain button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: '#818cf8', fontWeight: '500', padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '13px',
                background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff', fontWeight: '600', fontSize: '15px',
                borderRadius: '10px', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                marginBottom: '20px'
              }}>
                {loading ? '⏳ Signing in...' : 'Sign In →'}
              </button>

              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', margin: 0 }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600' }}>
                  Create one free
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