import { create } from 'zustand'
import type { User } from '@/types'

type AuthState = {
  user: User | null
  isInitialized: boolean
}

type AuthActions = {
  setUser: (user: User | null) => void
  setInitialized: () => void
  clear: () => void
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setInitialized: () => set({ isInitialized: true }),
  clear: () => set({ user: null, isInitialized: false }),
}))
