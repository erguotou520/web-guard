import { create } from 'zustand'
import apiClient from '../api/client'
import type {
  DnsSnapshot,
  SslSnapshot,
  UptimeSnapshot,
  UptimeAggregate,
  SecuritySnapshot,
  TimeRange,
} from '../api/types'

interface SnapshotState {
  // DNS snapshots
  dnsSnapshots: DnsSnapshot[]
  latestDnsSnapshot: DnsSnapshot | null
  dnsLoading: boolean

  // SSL snapshots
  sslSnapshots: SslSnapshot[]
  latestSslSnapshot: SslSnapshot | null
  sslLoading: boolean

  // Uptime snapshots
  uptimeSnapshots: UptimeSnapshot[]
  uptimeAggregates: UptimeAggregate[]
  uptimeLoading: boolean

  // Security snapshots
  securitySnapshots: SecuritySnapshot[]
  latestSecuritySnapshot: SecuritySnapshot | null
  securityLoading: boolean

  // Error
  error: string | null

  // Actions
  fetchDnsSnapshots: (domainId: string, limit?: number) => Promise<void>
  fetchSslSnapshots: (domainId: string, limit?: number) => Promise<void>
  fetchUptimeSnapshots: (domainId: string, timeRange: TimeRange) => Promise<void>
  fetchUptimeAggregates: (domainId: string) => Promise<void>
  fetchSecuritySnapshots: (domainId: string, limit?: number) => Promise<void>
  clearError: () => void
}

export const useSnapshotStore = create<SnapshotState>()((set, get) => ({
  // Initial state
  dnsSnapshots: [],
  latestDnsSnapshot: null,
  dnsLoading: false,

  sslSnapshots: [],
  latestSslSnapshot: null,
  sslLoading: false,

  uptimeSnapshots: [],
  uptimeAggregates: [],
  uptimeLoading: false,

  securitySnapshots: [],
  latestSecuritySnapshot: null,
  securityLoading: false,

  error: null,

  // Fetch DNS snapshots
  fetchDnsSnapshots: async (domainId: string, limit = 10) => {
    set({ dnsLoading: true, error: null })
    try {
      const response = await apiClient.get<{ data: DnsSnapshot[] }>(
        `/domains/${domainId}/dns-snapshots?limit=${limit}`
      )
      const snapshots = response.data.data
      set({
        dnsSnapshots: snapshots,
        latestDnsSnapshot: snapshots[0] || null,
        dnsLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch DNS snapshots'
      set({ error: message, dnsLoading: false })
      throw error
    }
  },

  // Fetch SSL snapshots
  fetchSslSnapshots: async (domainId: string, limit = 10) => {
    set({ sslLoading: true, error: null })
    try {
      const response = await apiClient.get<{ data: SslSnapshot[] }>(
        `/domains/${domainId}/ssl-snapshots?limit=${limit}`
      )
      const snapshots = response.data.data
      set({
        sslSnapshots: snapshots,
        latestSslSnapshot: snapshots[0] || null,
        sslLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch SSL snapshots'
      set({ error: message, sslLoading: false })
      throw error
    }
  },

  // Fetch uptime snapshots
  fetchUptimeSnapshots: async (domainId: string, timeRange: TimeRange) => {
    set({ uptimeLoading: true, error: null })
    try {
      const response = await apiClient.get<{ data: UptimeSnapshot[] }>(
        `/domains/${domainId}/uptime-snapshots?time_range=${timeRange}`
      )
      set({
        uptimeSnapshots: response.data.data,
        uptimeLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch uptime snapshots'
      set({ error: message, uptimeLoading: false })
      throw error
    }
  },

  // Fetch uptime aggregates
  fetchUptimeAggregates: async (domainId: string) => {
    set({ uptimeLoading: true, error: null })
    try {
      const response = await apiClient.get<{ data: UptimeAggregate[] }>(
        `/domains/${domainId}/uptime-aggregates`
      )
      set({
        uptimeAggregates: response.data.data,
        uptimeLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch uptime aggregates'
      set({ error: message, uptimeLoading: false })
      throw error
    }
  },

  // Fetch security snapshots
  fetchSecuritySnapshots: async (domainId: string, limit = 10) => {
    set({ securityLoading: true, error: null })
    try {
      const response = await apiClient.get<{ data: SecuritySnapshot[] }>(
        `/domains/${domainId}/security-snapshots?limit=${limit}`
      )
      const snapshots = response.data.data
      set({
        securitySnapshots: snapshots,
        latestSecuritySnapshot: snapshots[0] || null,
        securityLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch security snapshots'
      set({ error: message, securityLoading: false })
      throw error
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },
}))
