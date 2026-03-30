import { useEffect, lazy, Suspense } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { connectSocket, disconnectSocket } from './lib/socket'
import { connectChatSocket, disconnectChatSocket } from './lib/chatSocket'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'

// Eagerly loaded (landing + auth — needed immediately)
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Lazy-loaded app pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const TimeTrackerPage = lazy(() => import('./pages/TimeTrackerPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const TagsPage = lazy(() => import('./pages/TagsPage'))
const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const TeamsPage = lazy(() => import('./pages/TeamsPage'))
const TeamWorkspacePage = lazy(() => import('./pages/TeamWorkspacePage'))
const TeamProjectPage = lazy(() => import('./pages/TeamProjectPage'))
const JoinTeamPage = lazy(() => import('./pages/JoinTeamPage'))
const TeamSettingsPage = lazy(() => import('./pages/TeamSettingsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const BillingPage = lazy(() => import('./pages/BillingPage'))
const BillingSuccessPage = lazy(() => import('./pages/BillingSuccessPage'))
const BillingCancelPage = lazy(() => import('./pages/BillingCancelPage'))

// Lazy-loaded admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'))
const AdminSearchPage = lazy(() => import('./pages/admin/AdminSearchPage'))
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminSupportPage = lazy(() => import('./pages/admin/AdminSupportPage'))
const AdminBillingPage = lazy(() => import('./pages/admin/AdminBillingPage'))
const AdminModerationPage = lazy(() => import('./pages/admin/AdminModerationPage'))

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: '200px',
    }}>
      <div style={{
        width: '24px', height: '24px', border: '2px solid #334155',
        borderTopColor: '#6366f1', borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }} />
    </div>
  )
}

function RouteErrorBoundary() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: '200px', gap: '12px', color: '#e2e8f0', padding: '40px',
    }}>
      <p style={{ fontSize: '16px', fontWeight: 600 }}>This page crashed.</p>
      <p style={{ fontSize: '13px', color: '#94a3b8' }}>Try refreshing or navigating to a different page.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '4px', padding: '6px 16px', borderRadius: '8px',
          background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px',
        }}
      >
        Refresh
      </button>
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={<RouteErrorBoundary />}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </Sentry.ErrorBoundary>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (user?.role !== 'ADMIN') return <Navigate to="/app/dashboard" />
  return <>{children}</>
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe()      // always get fresh user data (role, suspension, etc.)
      connectSocket()
      connectChatSocket()
    } else {
      disconnectSocket()
      disconnectChatSocket()
    }
  }, [isAuthenticated])

  // Re-fetch user when tab regains focus so pendingWarning (and role changes) show immediately
  useEffect(() => {
    if (!isAuthenticated) return
    const handler = () => { if (document.visibilityState === 'visible') fetchMe() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [isAuthenticated, fetchMe])

  return (
    <Sentry.ErrorBoundary fallback={
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: '12px', color: '#e2e8f0', background: '#0f172a',
      }}>
        <p style={{ fontSize: '18px', fontWeight: 600 }}>Something went wrong.</p>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>Our team has been notified. Please refresh the page to try again.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px', padding: '8px 20px', borderRadius: '8px',
            background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px',
          }}
        >
          Refresh
        </button>
      </div>
    }>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<LazyPage><ForgotPasswordPage /></LazyPage>} />
          <Route path="/reset-password" element={<LazyPage><ResetPasswordPage /></LazyPage>} />

          {/* Protected app routes */}
          <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/app/dashboard" />} />
            <Route path="dashboard" element={<LazyPage><DashboardPage /></LazyPage>} />
            <Route path="projects" element={<LazyPage><ProjectsPage /></LazyPage>} />
            <Route path="tasks" element={<LazyPage><TasksPage /></LazyPage>} />
            <Route path="time-tracker" element={<LazyPage><TimeTrackerPage /></LazyPage>} />
            <Route path="calendar" element={<LazyPage><CalendarPage /></LazyPage>} />
            <Route path="settings" element={<LazyPage><SettingsPage /></LazyPage>} />
            <Route path="tags" element={<LazyPage><TagsPage /></LazyPage>} />
            <Route path="insights" element={<LazyPage><InsightsPage /></LazyPage>} />
            <Route path="teams" element={<LazyPage><TeamsPage /></LazyPage>} />
            <Route path="teams/:id" element={<LazyPage><TeamWorkspacePage /></LazyPage>} />
            <Route path="teams/:id/settings" element={<LazyPage><TeamSettingsPage /></LazyPage>} />
            <Route path="teams/:id/projects/:projectId" element={<LazyPage><TeamProjectPage /></LazyPage>} />
            <Route path="join" element={<LazyPage><JoinTeamPage /></LazyPage>} />
            <Route path="chat" element={<LazyPage><ChatPage /></LazyPage>} />
            <Route path="support" element={<LazyPage><SupportPage /></LazyPage>} />
            <Route path="billing" element={<LazyPage><BillingPage /></LazyPage>} />
            <Route path="billing/success" element={<LazyPage><BillingSuccessPage /></LazyPage>} />
            <Route path="billing/cancel" element={<LazyPage><BillingCancelPage /></LazyPage>} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" />} />
            <Route path="dashboard" element={<LazyPage><AdminDashboardPage /></LazyPage>} />
            <Route path="users" element={<LazyPage><AdminUsersPage /></LazyPage>} />
            <Route path="users/:id" element={<LazyPage><AdminUserDetailPage /></LazyPage>} />
            <Route path="activity" element={<LazyPage><AdminActivityPage /></LazyPage>} />
            <Route path="search" element={<LazyPage><AdminSearchPage /></LazyPage>} />
            <Route path="settings" element={<LazyPage><AdminSettingsPage /></LazyPage>} />
            <Route path="support" element={<LazyPage><AdminSupportPage /></LazyPage>} />
            <Route path="billing" element={<LazyPage><AdminBillingPage /></LazyPage>} />
            <Route path="moderation" element={<LazyPage><AdminModerationPage /></LazyPage>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}
