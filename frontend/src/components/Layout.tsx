import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, FolderKanban, CheckSquare, Timer, Calendar, LogOut, User } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/time-tracker', icon: Timer, label: 'Time Tracker' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#030712', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside style={{
        width: '240px', minWidth: '240px',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column'
      }}>

        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', backgroundColor: '#6366f1',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Timer size={16} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 }}>TrackFlow</h1>
              <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>Schedule Manager</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '10px',
              fontSize: '14px', fontWeight: '500',
              textDecoration: 'none', transition: 'all 0.15s',
              backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: isActive ? '#818cf8' : '#64748b',
              border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            })}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px' }}>
            <div style={{
              width: '32px', height: '32px', backgroundColor: '#6366f1',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <User size={14} color="#ffffff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ fontSize: '11px', color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#475569', padding: '4px', borderRadius: '6px',
              display: 'flex', alignItems: 'center'
            }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#030712' }}>
        <Outlet />
      </main>
    </div>
  )
}