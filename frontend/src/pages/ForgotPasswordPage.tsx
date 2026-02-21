import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Timer, ArrowLeft, Mail } from 'lucide-react'
import api from '../lib/axios'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
            Forgot password?
          </h1>
          <p style={{ color: '#64748b', marginTop: '8px', fontSize: '15px' }}>
            No worries, we'll send you a reset link
          </p>
        </div>

        <div style={{
          backgroundColor: '#0f172a', borderRadius: '20px',
          padding: '32px', border: '1px solid #1e293b'
        }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: '60px', height: '60px', backgroundColor: 'rgba(99,102,241,0.15)',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <Mail size={28} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', margin: '0 0 10px' }}>
                Check your email
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
                We sent a password reset link to <strong style={{ color: '#94a3b8' }}>{email}</strong>.
                It expires in 1 hour.
              </p>
              <Link to="/login" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                color: '#818cf8', textDecoration: 'none', fontSize: '14px', fontWeight: '600'
              }}>
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
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
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    style={{
                      width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155',
                      borderRadius: '10px', padding: '12px 16px', color: '#ffffff',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#334155'}
                  />
                </div>

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px',
                  background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#ffffff', fontWeight: '600', fontSize: '15px',
                  borderRadius: '10px', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)'
                }}>
                  {loading ? '⏳ Sending...' : 'Send Reset Link →'}
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