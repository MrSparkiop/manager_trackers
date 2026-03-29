import { create } from 'zustand'

type CallState = 'idle' | 'calling' | 'ringing' | 'active'

interface ChatStore {
  // Persist the open conversation across navigation
  activeConvId: string | null
  setActiveConvId: (id: string | null) => void

  // Snapshot of call state — written by ChatPage, read by Layout
  callState: CallState
  callPeer: { userId: string; userName: string } | null
  callDuration: number
  setCallSnapshot: (
    state: CallState,
    peer: { userId: string; userName: string } | null,
    duration: number,
  ) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  activeConvId: null,
  setActiveConvId: (id) => set({ activeConvId: id }),

  callState: 'idle',
  callPeer: null,
  callDuration: 0,
  setCallSnapshot: (callState, callPeer, callDuration) =>
    set({ callState, callPeer, callDuration }),
}))
