import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Timer, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '../lib/axios'

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams()
  const token                   = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const navigate                = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired reset link')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155',
    borderRadius: '10px', padding: '12px 16px', color: '#ffffff',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#030712', fontFamily: 'Inter, sans-serif', padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', backgroundColor: '#6366f1',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Timer size={24} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
            Set new password
          </h1>
          <p style={{ color: '#64748b', marginTop: '8px', fontSize: '15px' }}>
            Must be at least 8 characters
          </p>
        </div>

        <div style={{
          backgroundColor: '#0f172a', borderRadius: '20px',
          padding: '32px', border: '1px solid #1e293b'
        }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: '60px', height: '60px', backgroundColor: 'rgba(74,222,128,0.15)',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <CheckCircle2 size={28} color="#4ade80" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', margin: '0 0 10px' }}>
                Password reset!
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: '0 0 8px' }}>
                Your password has been updated successfully.
              </p>
              <p style={{ color: '#475569', fontSize: '13px', margin: '0 0 24px' }}>
                Redirecting to sign in...
              </p>
              <Link to="/login" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                color: '#818cf8', textDecoration: 'none', fontSize: '14px', fontWeight: '600'
              }}>
                <ArrowLeft size={14} /> Go to sign in now
              </Link>
            </div>
          ) : (
            <>
              {!token && (
                <div style={{
                  backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', padding: '12px 16px', borderRadius: '10px',
                  fontSize: '14px', marginBottom: '20px'
                }}>
                  ⚠️ Invalid reset link. Please request a new one.
                </div>
              )}

              {error && (
                <div style={{
                  backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', padding: '12px 16px', borderRadius: '10px',
                  fontSize: '14px', marginBottom: '20px'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.03em' }}>
                    NEW PASSWORD
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" required
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
                  {password.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '3px', borderRadius: '999px',
                            backgroundColor: i <= Math.min(Math.floor(password.length / 3), 4)
                              ? ['', '#f87171', '#facc15', '#60a5fa', '#4ade80'][Math.min(Math.floor(password.length / 3), 4)]
                              : '#1e293b',
                            transition: 'background-color 0.3s'
                          }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.03em' }}>
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'} value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password" required
                    style={{
                      ...inputStyle,
                      borderColor: confirm && confirm !== password ? '#ef4444' : '#334155'
                    }}
                    onFocus={e => e.target.style.borderColor = confirm !== password ? '#ef4444' : '#6366f1'}
                    onBlur={e => e.target.style.borderColor = confirm !== password ? '#ef4444' : '#334155'}
                  />
                  {confirm && confirm !== password && (
                    <p style={{ fontSize: '12px', color: '#f87171', margin: '6px 0 0' }}>
                      Passwords don't match
                    </p>
                  )}
                </div>

                <button type="submit" disabled={loading || !token} style={{
                  width: '100%', padding: '13px',
                  background: loading || !token ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#ffffff', fontWeight: '600', fontSize: '15px',
                  borderRadius: '10px', border: 'none',
                  cursor: loading || !token ? 'not-allowed' : 'pointer',
                  boxShadow: loading || !token ? 'none' : '0 4px 20px rgba(99,102,241,0.4)'
                }}>
                  {loading ? '⏳ Resetting...' : 'Reset Password →'}
                </button>

                <Link to="/login" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  color: '#64748b', textDecoration: 'none', fontSize: '14px'
                }}>
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}