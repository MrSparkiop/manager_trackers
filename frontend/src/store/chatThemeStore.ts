import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatThemeStore {
  chatThemeId: string
  setChatThemeId: (id: string) => void
}

export const useChatThemeStore = create<ChatThemeStore>()(
  persist(
    (set) => ({
      chatThemeId: 'default',
      setChatThemeId: (id) => set({ chatThemeId: id }),
    }),
    { name: 'chat-theme-storage' },
  ),
)
