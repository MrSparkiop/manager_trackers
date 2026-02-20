import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { User, Moon, Sun, Save } from 'lucide-react'
import api from '../lib/axios'

export default function SettingsPage() {
  const { isDark } = useThemeStore()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const { toggle } = useThemeStore()

  const colors = {
    bg: isDark ? '#030712' : '#f1f5f9',
    card: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    input: isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  const inputStyle = {
    width: '100%', backgroundColor: colors.input,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '10px', padding: '10px 14px',
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const
  }

  const card = {
    backgroundColor: colors.card, borderRadius: '16px',
    border: `1px solid ${colors.border}`, padding: '24px',
    marginBottom: '16px'
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: '0 0 8px' }}>Settings</h1>
        <p style={{ color: colors.textMuted, marginBottom: '28px', fontSize: '14px' }}>Manage your account and preferences</p>

        {/* Profile */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="#6366f1" /> Profile Information
          </h2>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', backgroundColor: '#6366f1',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '24px', fontWeight: '700', color: '#ffffff'
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: colors.text, margin: 0 }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>First Name</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Last Name</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '6px' }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </div>
            <button type="submit" style={{
              display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              backgroundColor: saved ? '#22c55e' : '#6366f1', color: '#ffffff',
              border: 'none', borderRadius: '10px', padding: '10px 20px',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              transition: 'background-color 0.2s', width: 'fit-content'
            }}>
              <Save size={15} />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Appearance */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDark ? <Moon size={16} color="#6366f1" /> : <Sun size={16} color="#6366f1" />} Appearance
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: colors.text, margin: 0 }}>Theme</p>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: '4px 0 0' }}>
                Currently using {isDark ? 'dark' : 'light'} mode
              </p>
            </div>
            <button onClick={toggle} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
              border: `1px solid ${colors.border}`,
              borderRadius: '10px', padding: '10px 16px',
              color: colors.text, fontSize: '14px', fontWeight: '500',
              cursor: 'pointer'
            }}>
              {isDark ? <><Sun size={15} /> Light Mode</> : <><Moon size={15} /> Dark Mode</>}
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div style={card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.text, margin: '0 0 16px' }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Member since', value: 'February 2026' },
              { label: 'Account type', value: 'Personal' },
              { label: 'Status', value: 'Active' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: '14px', color: colors.textMuted }}>{label}</span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}