import { create } from 'zustand'
import apiClient from '../api/client'
import type { Organization, CreateOrganizationRequest, OrganizationMember, AddMemberRequest } from '../api/types'

interface OrgState {
  // State
  organizations: Organization[]
  currentOrganization: Organization | null
  members: OrganizationMember[]
  loading: boolean
  error: string | null

  // Actions
  fetchOrganizations: () => Promise<void>
  fetchOrganization: (id: string) => Promise<void>
  createOrganization: (data: CreateOrganizationRequest) => Promise<Organization>
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<void>
  deleteOrganization: (id: string) => Promise<void>
  setCurrentOrganization: (org: Organization) => void
  fetchMembers: (orgId: string) => Promise<void>
  addMember: (orgId: string, data: AddMemberRequest) => Promise<void>
  removeMember: (orgId: string, userId: string) => Promise<void>
  updateMemberRole: (orgId: string, userId: string, role: string) => Promise<void>
  clearError: () => void
}

export const useOrgStore = create<OrgState>()((set, get) => ({
  // Initial state
  organizations: [],
  currentOrganization: null,
  members: [],
  loading: false,
  error: null,

  // Fetch all user's organizations
  fetchOrganizations: async () => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{ data: Organization[] }>('/organizations')
      set({ organizations: response.data.data, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch organizations'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Fetch a single organization
  fetchOrganization: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{ data: Organization }>(`/organizations/${id}`)
      set({ currentOrganization: response.data.data, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch organization'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Create a new organization
  createOrganization: async (data: CreateOrganizationRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post<{ data: Organization }>('/organizations', data)
      const newOrg = response.data.data

      set((state) => ({
        organizations: [...state.organizations, newOrg],
        loading: false,
      }))

      return newOrg
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create organization'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Update an organization
  updateOrganization: async (id: string, data: Partial<Organization>) => {
    set({ loading: true, error: null })
    try {
      await apiClient.put(`/organizations/${id}`, data)

      set((state) => ({
        organizations: state.organizations.map((org) =>
          org.id === id ? { ...org, ...data } : org
        ),
        currentOrganization:
          state.currentOrganization?.id === id
            ? { ...state.currentOrganization, ...data }
            : state.currentOrganization,
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update organization'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Delete an organization
  deleteOrganization: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.delete(`/organizations/${id}`)

      set((state) => ({
        organizations: state.organizations.filter((org) => org.id !== id),
        currentOrganization: state.currentOrganization?.id === id ? null : state.currentOrganization,
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete organization'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Set current organization
  setCurrentOrganization: (org: Organization) => {
    set({ currentOrganization: org })
  },

  // Fetch organization members
  fetchMembers: async (orgId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.get<{ data: OrganizationMember[] }>(
        `/organizations/${orgId}/members`
      )
      set({ members: response.data.data, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch members'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Add a member to organization
  addMember: async (orgId: string, data: AddMemberRequest) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.post<{ data: OrganizationMember }>(
        `/organizations/${orgId}/members`,
        data
      )
      const newMember = response.data.data

      set((state) => ({
        members: [...state.members, newMember],
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add member'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Remove a member from organization
  removeMember: async (orgId: string, userId: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.delete(`/organizations/${orgId}/members/${userId}`)

      set((state) => ({
        members: state.members.filter((m) => m.user_id !== userId),
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove member'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Update member role
  updateMemberRole: async (orgId: string, userId: string, role: string) => {
    set({ loading: true, error: null })
    try {
      await apiClient.put(`/organizations/${orgId}/members/${userId}`, { role })

      set((state) => ({
        members: state.members.map((m) =>
          m.user_id === userId ? { ...m, role: role as any } : m
        ),
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update member role'
      set({ error: message, loading: false })
      throw error
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))
