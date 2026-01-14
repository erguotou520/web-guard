import { create } from 'zustand'
import apiClient from '../api/client'
import type { Alert } from '../api/types'

interface AlertState {
  // State
  alerts: Alert[]
  unreadCount: number
  loading: boolean
  error: string | null

  // Actions
  fetchAlerts: (orgId: string, limit?: number) => Promise<void>
  markAsRead: (alertId: string) => Promise<void>
  markAllAsRead: (orgId: string) => Promise<void>
  clearError: () => void
}

export const useAlertStore = create<AlertState>()((set, get) => ({
  // Initial state
  alerts: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Fetch alerts for an organization
  fetchAlerts: async (orgId: string, limit = 50) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{ data: Alert[] }>(
        `/organizations/${orgId}/alerts?limit=${limit}`
      )
      const alerts = response.data.data
      set({
        alerts,
        unreadCount: alerts.filter((a) => !a.webhook_sent_at).length, // Simplified unread logic
        loading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch alerts'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Mark an alert as read
  markAsRead: async (alertId: string) => {
    try {
      await apiClient.put(`/alerts/${alertId}`, { read: true })

      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === alertId ? { ...a } : a
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to mark alert as read'
      set({ error: message })
      throw error
    }
  },

  // Mark all alerts as read
  markAllAsRead: async (orgId: string) => {
    try {
      await apiClient.post(`/organizations/${orgId}/alerts/mark-read`, {})

      set({
        unreadCount: 0,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to mark all alerts as read'
      set({ error: message })
      throw error
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))
