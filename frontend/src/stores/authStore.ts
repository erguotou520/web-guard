import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
  last_login_at?: string
}

interface AuthState {
  // State
  user: User | null
  token: string | null
  refreshToken: string | null
  currentOrgId: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setToken: (accessToken: string, refreshToken?: string) => void
  setUser: (user: User) => void
  logout: () => void
  setCurrentOrg: (orgId: string) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      currentOrgId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Set token
      setToken: (accessToken: string, refreshToken?: string) => {
        set({
          token: accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: !!accessToken
        })
      },

      // Set user
      setUser: (user: User) => {
        set({ user })
      },

      // Logout
      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          currentOrgId: null,
          isAuthenticated: false,
        })
      },

      // Set current organization
      setCurrentOrg: (orgId: string) => {
        set({ currentOrgId: orgId })
      },

      // Clear error
      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        currentOrgId: state.currentOrgId,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // 在重新水化后，根据 token 设置 isAuthenticated
        if (state && state.token) {
          state.isAuthenticated = true
        }
      },
    }
  )
)
