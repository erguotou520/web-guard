import { create } from 'zustand'
import apiClient from '../api/client'
import type { Domain, CreateDomainRequest } from '../api/types'

interface DomainState {
  // State
  domains: Domain[]
  currentDomain: Domain | null
  loading: boolean
  error: string | null

  // Actions
  fetchDomains: (orgId: string) => Promise<void>
  fetchDomain: (id: string) => Promise<void>
  createDomain: (orgId: string, data: CreateDomainRequest) => Promise<Domain>
  updateDomain: (id: string, data: Partial<Domain>) => Promise<void>
  deleteDomain: (id: string) => Promise<void>
  setCurrentDomain: (domain: Domain) => void
  clearError: () => void
}

export const useDomainStore = create<DomainState>()((set, get) => ({
  // Initial state
  domains: [],
  currentDomain: null,
  loading: false,
  error: null,

  // Fetch all domains for an organization
  fetchDomains: async (orgId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{ data: Domain[] }>(`/organizations/${orgId}/domains`)
      set({ domains: response.data.data, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch domains'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Fetch a single domain
  fetchDomain: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{ data: Domain }>(`/domains/${id}`)
      set({ currentDomain: response.data.data, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch domain'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Create a new domain
  createDomain: async (orgId: string, data: CreateDomainRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post<{ data: Domain }>(`/organizations/${orgId}/domains`, data)
      const newDomain = response.data.data

      set((state) => ({
        domains: [...state.domains, newDomain],
        loading: false,
      }))

      return newDomain
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create domain'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Update a domain
  updateDomain: async (id: string, data: Partial<Domain>) => {
    set({ loading: true, error: null })
    try {
      await apiClient.put(`/domains/${id}`, data)

      set((state) => ({
        domains: state.domains.map((d) => (d.id === id ? { ...d, ...data } : d)),
        currentDomain: state.currentDomain?.id === id ? { ...state.currentDomain, ...data } : state.currentDomain,
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update domain'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Delete a domain
  deleteDomain: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.delete(`/domains/${id}`)

      set((state) => ({
        domains: state.domains.filter((d) => d.id !== id),
        currentDomain: state.currentDomain?.id === id ? null : state.currentDomain,
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete domain'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Set current domain
  setCurrentDomain: (domain: Domain) => {
    set({ currentDomain: domain })
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))
