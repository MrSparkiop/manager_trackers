import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/axios'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        // Token is now in HttpOnly cookie — only store user info in Zustand
        set({ user: res.data.user, isAuthenticated: true })
      },

      register: async (email, password, firstName, lastName) => {
        const res = await api.post('/auth/register', { email, password, firstName, lastName })
        set({ user: res.data.user, isAuthenticated: true })
      },

      logout: async () => {
        await api.post('/auth/logout')
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user info — NO token in localStorage anymore!
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)