import { useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { connectSocket, disconnectSocket } from './lib/socket'
import GlobalSearch from './components/GlobalSearch'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import TimeTrackerPage from './pages/TimeTrackerPage'
import CalendarPage from './pages/CalendarPage'
import SettingsPage from './pages/SettingsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import TagsPage from './pages/TagsPage'
import InsightsPage from './pages/InsightsPage'
import TeamsPage from './pages/TeamsPage'
import TeamWorkspacePage from './pages/TeamWorkspacePage'
import TeamProjectPage from './pages/TeamProjectPage'
import JoinTeamPage from './pages/JoinTeamPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminActivityPage from './pages/admin/AdminActivityPage'
import AdminSearchPage from './pages/admin/AdminSearchPage'
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import TeamSettingsPage from './pages/TeamSettingsPage'
import SupportPage from './pages/SupportPage'
import AdminSupportPage from './pages/admin/AdminSupportPage'
import BillingPage from './pages/BillingPage'
import BillingSuccessPage from './pages/BillingSuccessPage'
import BillingCancelPage from './pages/BillingCancelPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" />
  if ((user as any)?.role !== 'ADMIN') return <Navigate to="/app/dashboard" />
  return <>{children}</>
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe()      // always get fresh user data (role, suspension, etc.)
      connectSocket()
    } else {
      disconnectSocket()
    }
  }, [isAuthenticated])

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
        {/* Global search available everywhere when authenticated */}
        {isAuthenticated && <GlobalSearch />}

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected app routes */}
          <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/app/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="time-tracker" element={<TimeTrackerPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:id" element={<TeamWorkspacePage />} />
            <Route path="teams/:id/settings" element={<TeamSettingsPage />} />
            <Route path="teams/:id/projects/:projectId" element={<TeamProjectPage />} />
            <Route path="join" element={<JoinTeamPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="billing/success" element={<BillingSuccessPage />} />
            <Route path="billing/cancel" element={<BillingCancelPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailPage />} />
            <Route path="activity" element={<AdminActivityPage />} />
            <Route path="search" element={<AdminSearchPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="support" element={<AdminSupportPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}