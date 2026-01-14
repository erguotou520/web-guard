import { create } from 'zustand'
import apiClient from '../api/client'
import type { Monitor, CreateMonitorRequest } from '../api/types'

interface MonitorState {
  // State
  monitors: Monitor[]
  loading: boolean
  error: string | null

  // Actions
  fetchMonitors: (domainId: string) => Promise<void>
  createMonitor: (domainId: string, data: CreateMonitorRequest) => Promise<Monitor>
  updateMonitor: (id: string, data: Partial<Monitor>) => Promise<void>
  toggleMonitor: (id: string) => Promise<void>
  deleteMonitor: (id: string) => Promise<void>
  clearError: () => void
}

export const useMonitorStore = create<MonitorState>()((set, get) => ({
  // Initial state
  monitors: [],
  loading: false,
  error: null,

  // Fetch monitors for a domain
  fetchMonitors: async (domainId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{ data: Monitor[] }>(`/domains/${domainId}/monitors`)
      set({ monitors: response.data.data, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch monitors'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Create a new monitor
  createMonitor: async (domainId: string, data: CreateMonitorRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post<{ data: Monitor }>(`/domains/${domainId}/monitors`, data)
      const newMonitor = response.data.data

      set((state) => ({
        monitors: [...state.monitors, newMonitor],
        loading: false,
      }))

      return newMonitor
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create monitor'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Update a monitor
  updateMonitor: async (id: string, data: Partial<Monitor>) => {
    set({ loading: true, error: null })
    try {
      await apiClient.put(`/monitors/${id}`, data)

      set((state) => ({
        monitors: state.monitors.map((m) => (m.id === id ? { ...m, ...data } : m)),
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update monitor'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Toggle monitor enabled/disabled
  toggleMonitor: async (id: string) => {
    const monitor = get().monitors.find((m) => m.id === id)
    if (!monitor) return

    set({ loading: true, error: null })
    try {
      await apiClient.post(`/monitors/${id}/toggle`, {
        is_enabled: !monitor.is_enabled,
      })

      set((state) => ({
        monitors: state.monitors.map((m) =>
          m.id === id ? { ...m, is_enabled: !m.is_enabled } : m
        ),
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to toggle monitor'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Delete a monitor
  deleteMonitor: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.delete(`/monitors/${id}`)

      set((state) => ({
        monitors: state.monitors.filter((m) => m.id !== id),
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete monitor'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))
