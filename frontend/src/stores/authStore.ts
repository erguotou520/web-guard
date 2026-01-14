import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '../api/client'
import type { User, Organization, LoginRequest, RegisterRequest, AuthResponse } from '../api/types'

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
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<void>
  setCurrentOrg: (orgId: string) => void
  updateUser: (user: User) => void
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

      // Login
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
          const { access_token, refresh_token, user } = response.data

          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)

          set({
            token: access_token,
            refreshToken: refresh_token,
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Register
      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.post<AuthResponse>('/auth/register', data)
          const { access_token, refresh_token, user } = response.data

          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)

          set({
            token: access_token,
            refreshToken: refresh_token,
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Registration failed'
          set({ error: message, isLoading: false })
          throw error
        }
      },

      // Logout
      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('current_org_id')
        set({
          token: null,
          refreshToken: null,
          user: null,
          currentOrgId: null,
          isAuthenticated: false,
        })
      },

      // Refresh access token
      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await apiClient.post<{ access_token: string }>('/auth/refresh', {
            refresh_token: refreshToken,
          })
          const { access_token } = response.data

          localStorage.setItem('access_token', access_token)
          set({ token: access_token })
        } catch {
          // Refresh failed - logout
          get().logout()
          throw new Error('Session expired. Please login again.')
        }
      },

      // Set current organization
      setCurrentOrg: (orgId: string) => {
        localStorage.setItem('current_org_id', orgId)
        set({ currentOrgId: orgId })
      },

      // Update user info
      updateUser: (user: User) => {
        set({ user })
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
    }
  )
)
