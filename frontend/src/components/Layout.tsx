import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Timer, Calendar, LogOut, User, Sun, Moon, Settings
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/time-tracker', icon: Timer, label: 'Time Tracker' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const colors = {
    bg: isDark ? '#030712' : '#f8fafc',
    sidebar: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    textSub: isDark ? '#475569' : '#cbd5e1',
    navActive: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
    navActiveBorder: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
    navActiveText: '#818cf8',
    navHover: isDark ? '#1e293b' : '#f1f5f9',
    main: isDark ? '#030712' : '#f1f5f9',
  }

  return (
    <div style={{
      display: 'flex', height: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'Inter, sans-serif', overflow: 'hidden'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', minWidth: '240px',
        backgroundColor: colors.sidebar,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.2s'
      }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', backgroundColor: '#6366f1',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Timer size={16} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '15px', fontWeight: '700', color: colors.text, margin: 0 }}>TrackFlow</h1>
                <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>Schedule Manager</p>
              </div>
            </div>
            {/* Theme toggle */}
            <button onClick={toggle} style={{
              background: 'none', border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '6px', cursor: 'pointer',
              color: colors.textMuted, display: 'flex', alignItems: 'center',
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
            }}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <p style={{ fontSize: '10px', fontWeight: '600', color: colors.textMuted, padding: '8px 8px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Menu
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: '9px',
              fontSize: '13.5px', fontWeight: '500',
              textDecoration: 'none', transition: 'all 0.15s',
              backgroundColor: isActive ? colors.navActive : 'transparent',
              color: isActive ? colors.navActiveText : colors.textMuted,
              border: isActive ? `1px solid ${colors.navActiveBorder}` : '1px solid transparent',
            })}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '10px', borderTop: `1px solid ${colors.border}` }}>
          <NavLink to="/settings" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 10px', borderRadius: '9px',
            fontSize: '13.5px', fontWeight: '500',
            textDecoration: 'none', transition: 'all 0.15s', marginBottom: '4px',
            backgroundColor: isActive ? colors.navActive : 'transparent',
            color: isActive ? colors.navActiveText : colors.textMuted,
            border: isActive ? `1px solid ${colors.navActiveBorder}` : '1px solid transparent',
          })}>
            <Settings size={16} />
            Settings
          </NavLink>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 10px', borderRadius: '9px',
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{
              width: '30px', height: '30px', backgroundColor: '#6366f1',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <User size={13} color="#ffffff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ fontSize: '10px', color: colors.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textMuted, padding: '2px',
              display: 'flex', alignItems: 'center', flexShrink: 0
            }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', backgroundColor: colors.main }}>
        <Outlet context={{ isDark, colors }} />
      </main>
    </div>
  )
}