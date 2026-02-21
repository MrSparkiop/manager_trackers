import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/axios'

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
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const res = await api.post('/auth/login', { email, password })
          set({ user: res.data.user, isAuthenticated: true })
        } catch (error: any) {
          const message = error?.response?.data?.message || 'Invalid email or password'
          throw new Error(message)
        }
      },

      register: async (email, password, firstName, lastName) => {
        const res = await api.post('/auth/register', { email, password, firstName, lastName })
        set({ user: res.data.user, isAuthenticated: true })
      },

      logout: async () => {
        await api.post('/auth/logout')
        set({ user: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        const res = await api.get('/auth/me')
        set({ user: res.data, isAuthenticated: true })
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