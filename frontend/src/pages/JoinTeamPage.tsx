import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Users, Loader } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'

export default function JoinTeamPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const code = searchParams.get('code')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/app/join?code=${code}`)
      return
    }
    if (!code) { setStatus('error'); setMessage('Invalid invite link'); return }

    api.post('/teams/join', { inviteCode: code })
      .then(res => {
        setStatus('success')
        setMessage(`Successfully joined the team!`)
        setTimeout(() => navigate(`/app/teams/${res.data.teamId}`), 2000)
      })
      .catch(err => {
        setStatus('error')
        setMessage(err?.response?.data?.message || 'Invalid or expired invite link')
      })
  }, [code, isAuthenticated])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#030712', fontFamily: 'Inter, sans-serif', padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid #1e293b',
        padding: '48px', textAlign: 'center', maxWidth: '380px', width: '100%'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 20px',
          background: status === 'success' ? 'linear-gradient(135deg, #4ade80, #22c55e)' :
                      status === 'error'   ? 'linear-gradient(135deg, #f87171, #ef4444)' :
                      'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {status === 'loading' ? <Loader size={28} color="#fff" /> : <Users size={28} color="#fff" />}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: '0 0 8px' }}>
          {status === 'loading' ? 'Joining team...' :
           status === 'success' ? 'Joined! 🎉' : 'Oops!'}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          {status === 'loading' ? 'Please wait...' : message}
        </p>
        {status === 'error' && (
          <button onClick={() => navigate('/app/teams')} style={{
            marginTop: '20px', padding: '10px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: '10px', color: '#fff',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>
            Go to Teams
          </button>
        )}
      </div>
    </div>
  )
}