import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Timer, Calendar, LogOut, User, Sun, Moon, Settings, Menu, X, Tag
} from 'lucide-react'

const navItems = [
  { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/projects',     icon: FolderKanban,    label: 'Projects' },
  { to: '/app/tasks',        icon: CheckSquare,     label: 'Tasks' },
  { to: '/app/time-tracker', icon: Timer,           label: 'Time Tracker' },
  { to: '/app/calendar',     icon: Calendar,        label: 'Calendar' },
  { to: '/app/tags',         icon: Tag,             label: 'Tags' },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const colors = {
    bg: isDark ? '#030712' : '#f8fafc',
    sidebar: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    navActive: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
    navActiveBorder: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
    navActiveText: '#818cf8',
    main: isDark ? '#030712' : '#f1f5f9',
  }

  const SidebarContent = () => (
    <>
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
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={toggle} style={{
              background: 'none', border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '6px', cursor: 'pointer',
              color: colors.textMuted, display: 'flex', alignItems: 'center',
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
            }}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{
                background: 'none', border: `1px solid ${colors.border}`,
                borderRadius: '8px', padding: '6px', cursor: 'pointer',
                color: colors.textMuted, display: 'flex', alignItems: 'center',
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
              }}>
                <X size={14} />
              </button>
            )}
          </div>
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
    </>
  )

  return (
    <div style={{
      display: 'flex', height: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'Inter, sans-serif', overflow: 'hidden'
    }}>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside style={{
          width: '240px', minWidth: '240px',
          backgroundColor: colors.sidebar,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex', flexDirection: 'column',
        }}>
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <>
          {/* Backdrop */}
          <div onClick={() => setSidebarOpen(false)} style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40, backdropFilter: 'blur(2px)'
          }} />
          {/* Drawer */}
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '260px', zIndex: 50,
            backgroundColor: colors.sidebar,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
          }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Mobile Top Bar */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: colors.sidebar,
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}>
            <button onClick={() => setSidebarOpen(true)} style={{
              background: 'none', border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '7px', cursor: 'pointer',
              color: colors.textMuted, display: 'flex', alignItems: 'center',
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
            }}>
              <Menu size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', backgroundColor: '#6366f1',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Timer size={14} color="#ffffff" />
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', color: colors.text }}>TrackFlow</span>
            </div>

            <button onClick={toggle} style={{
              background: 'none', border: `1px solid ${colors.border}`,
              borderRadius: '8px', padding: '7px', cursor: 'pointer',
              color: colors.textMuted, display: 'flex', alignItems: 'center',
              backgroundColor: isDark ? '#1e293b' : '#f1f5f9'
            }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        )}

        <main style={{ flex: 1, overflow: 'auto', backgroundColor: colors.main }}>
          <Outlet context={{ isDark, colors, isMobile }} />
        </main>
      </div>
    </div>
  )
}