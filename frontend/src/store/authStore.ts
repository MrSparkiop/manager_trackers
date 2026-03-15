import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as Sentry from '@sentry/react'
import api from '../lib/axios'
import { connectSocket, disconnectSocket } from '../lib/socket'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post('/auth/login', { email, password })
          set({ user: res.data.user, isAuthenticated: true, isLoading: false })
          Sentry.setUser({ id: res.data.user.id, email: res.data.user.email, username: `${res.data.user.firstName} ${res.data.user.lastName}` })
          connectSocket()
        } catch (err: any) {
          const message =
            err?.response?.data?.message ||
            err?.message ||
            'Login failed. Please try again.'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      register: async (email, password, firstName, lastName) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post('/auth/register', { email, password, firstName, lastName })
          set({ user: res.data.user, isAuthenticated: true, isLoading: false })
          Sentry.setUser({ id: res.data.user.id, email: res.data.user.email, username: `${res.data.user.firstName} ${res.data.user.lastName}` })
        } catch (err: any) {
          const message =
            err?.response?.data?.message ||
            err?.message ||
            'Registration failed. Please try again.'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (error) {
          console.warn('Server logout failed, clearing local state anyway', error)
        } finally {
          disconnectSocket()
          Sentry.setUser(null)
          set({ user: null, isAuthenticated: false, isLoading: false, error: null })
        }
      },

      fetchMe: async () => {
        try {
          const res = await api.get('/auth/me')
          set({ user: res.data, isAuthenticated: true })
          Sentry.setUser({ id: res.data.id, email: res.data.email, username: `${res.data.firstName} ${res.data.lastName}` })
        } catch {
          Sentry.setUser(null)
          set({ user: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
