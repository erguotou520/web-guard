import { Monitor, CheckCircle, XCircle, Activity, Shield, Clock, Loader2, AlertCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { StatusBar } from '@/components/StatusBar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'

interface PublicDomainStatus {
  id: string
  name: string
  url: string
  is_active: boolean
  is_up?: boolean
  response_time_ms?: number
  last_check_time?: string
  uptime_7d?: number
  uptime_30d?: number
}

interface OrganizationWithDomains {
  organization: {
    id: string
    name: string
    slug: string
    created_at: string
  }
  domains: PublicDomainStatus[]
}

export default function PublicStatus() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  // Fetch public status data
  const { data, loading, error } = useRequest(
    async () => {
      if (!orgSlug) return null

      const { data, error } = await client.get('/api/public/status/{org_slug}', {
        params: { org_slug: orgSlug }
      })

      if (error) {
        console.error('Failed to fetch public status:', error)
        return null
      }

      return (data?.data || null) as OrganizationWithDomains | null
    },
    {
      ready: !!orgSlug,
      pollingInterval: 30000, // Refresh every 30 seconds
      refreshDeps: [orgSlug]
    }
  )

  // Calculate overall system status
  const activeDomains = data?.domains.filter(d => d.is_active) || []
  const onlineDomains = activeDomains.filter(d => d.is_up === true)
  const offlineDomains = activeDomains.filter(d => d.is_up === false)
  const isAllOperational = activeDomains.length > 0 && offlineDomains.length === 0

  // Calculate average uptime
  const avgUptime7d = activeDomains.length > 0
    ? activeDomains.reduce((sum, d) => sum + (d.uptime_7d || 0), 0) / activeDomains.length
    : 0

  const avgUptime30d = activeDomains.length > 0
    ? activeDomains.reduce((sum, d) => sum + (d.uptime_30d || 0), 0) / activeDomains.length
    : 0

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-matrix mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">Loading status page...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h1 className="font-display text-2xl text-error mb-2">Status Page Not Found</h1>
          <p className="text-muted-foreground">
            The organization "{orgSlug}" does not exist or has no public status page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 bg-primary text-primary-foreground">
              <Shield className="w-12 h-12" />
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-matrix mb-3 animate-matrix">
            {data.organization.name}
          </h1>
          <p className="text-muted-foreground text-lg font-mono">
            Status Page · Updated every 30s
          </p>
        </div>

        {/* Overall Status */}
        <Card className="p-8 md:p-12 mb-8 terminal-border">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`flex items-center justify-center w-16 h-16 ${
              isAllOperational ? 'bg-success/20 border border-success' : 'bg-error/20 border border-error'
            }`}>
              {isAllOperational ? (
                <CheckCircle className="w-10 h-10 text-success" />
              ) : (
                <XCircle className="w-10 h-10 text-error" />
              )}
            </div>
            <div className="text-left">
              <h2 className={`font-display text-2xl mb-1 ${
                isAllOperational ? 'text-success' : 'text-error'
              }`}>
                {isAllOperational ? 'All Systems Operational' : 'Service Disruption'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {activeDomains.length} service{activeDomains.length !== 1 ? 's' : ''} monitored ·
                {onlineDomains.length} online · {offlineDomains.length} offline
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="terminal-border p-6 text-center">
              <Activity className="w-8 h-8 text-matrix/50 mx-auto mb-2" />
              <p className="font-display text-3xl text-matrix">
                {avgUptime7d > 0 ? `${avgUptime7d.toFixed(1)}%` : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Uptime (7d)</p>
            </div>
            <div className="terminal-border p-6 text-center">
              <Activity className="w-8 h-8 text-cyan/50 mx-auto mb-2" />
              <p className="font-display text-3xl text-cyan">
                {avgUptime30d > 0 ? `${avgUptime30d.toFixed(1)}%` : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Uptime (30d)</p>
            </div>
            <div className="terminal-border p-6 text-center">
              <Shield className="w-8 h-8 text-success/50 mx-auto mb-2" />
              <p className="font-display text-3xl text-success">{offlineDomains.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Current Incidents</p>
            </div>
          </div>
        </Card>

        {/* Services Status */}
        <div className="space-y-4 mb-8">
          <h3 className="font-display text-xl text-matrix mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Services
          </h3>

          {activeDomains.length === 0 ? (
            <Card className="p-8 text-center terminal-border">
              <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No services are currently being monitored</p>
            </Card>
          ) : (
            activeDomains.map((domain) => (
              <Card key={domain.id} className="p-6 terminal-border">
                {/* Domain Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-display text-lg text-foreground">{domain.name}</h4>
                      <Badge
                        variant={domain.is_up === true ? 'success' : domain.is_up === false ? 'error' : 'outline'}
                      >
                        {domain.is_up === true ? 'Operational' : domain.is_up === false ? 'Down' : 'Checking...'}
                      </Badge>
                    </div>
                    <a
                      href={domain.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground font-mono hover:text-matrix transition-colors"
                    >
                      {domain.url}
                    </a>
                  </div>
                  <div className="text-right">
                    {domain.response_time_ms !== null && domain.response_time_ms !== undefined && (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className={`font-mono ${
                          domain.response_time_ms < 200 ? 'text-success' :
                          domain.response_time_ms < 500 ? 'text-warning' : 'text-error'
                        }`}>
                          {domain.response_time_ms}ms
                        </span>
                      </div>
                    )}
                    {domain.last_check_time && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last check: {format(new Date(domain.last_check_time), 'HH:mm:ss')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Uptime Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">7-day uptime</p>
                    <p className="font-display text-xl text-matrix">
                      {domain.uptime_7d !== null && domain.uptime_7d !== undefined
                        ? `${Number(domain.uptime_7d).toFixed(2)}%`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">30-day uptime</p>
                    <p className="font-display text-xl text-cyan">
                      {domain.uptime_30d !== null && domain.uptime_30d !== undefined
                        ? `${Number(domain.uptime_30d).toFixed(2)}%`
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* 24-hour StatusBar */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">24-hour history</p>
                  <StatusBar domainId={domain.id} hours={24} />
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t border-border pt-6 mt-8">
          <p className="font-mono mb-2">
            <span className="text-matrix">▓</span> Powered by WebGuard Monitoring System
          </p>
          <p>
            <a
              href="/auth/login"
              className="text-matrix hover:underline transition-colors"
            >
              Login to Dashboard
            </a>
            {' · '}
            <span className="text-muted-foreground/60">
              Page generated at {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
