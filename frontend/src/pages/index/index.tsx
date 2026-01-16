import { Monitor, Globe, Activity, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { useRequest } from 'ahooks'
import { Card } from '@/components/ui/Card'
import { client } from '@/api'
import { useAuthStore } from '@/stores/authStore'

export default function Dashboard() {
  const { currentOrgId } = useAuthStore()

  // Fetch organization statistics
  const { data: stats, loading } = useRequest(
    async () => {
      if (!currentOrgId) return null

      const { data, error } = await client.get('/api/organizations/{id}/stats', {
        params: { id: currentOrgId }
      })

      if (error) {
        console.error('Failed to fetch organization stats:', error)
        return null
      }

      return data?.data
    },
    {
      ready: !!currentOrgId,
      refreshDeps: [currentOrgId],
      pollingInterval: 60000, // Refresh every 60 seconds
    }
  )

  const formatUptime = (uptime?: number | null) => {
    if (uptime === null || uptime === undefined) return '-'
    return `${uptime.toFixed(1)}%`
  }

  const showEmptyState = !loading && stats && stats.total_domains === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl text-matrix flex items-center gap-2">
          <Monitor className="w-6 h-6" />
          控制台
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          系统概览与监控状态
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 terminal-border animate-pulse-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">总域名</p>
              <p className="font-display text-3xl text-matrix mt-2">
                {loading ? '-' : stats?.total_domains || 0}
              </p>
            </div>
            <Globe className="w-10 h-10 text-matrix/30" />
          </div>
        </Card>

        <Card className="p-6 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">在线域名</p>
              <p className="font-display text-3xl text-success mt-2">
                {loading ? '-' : stats?.online_domains || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                / {loading ? '-' : stats?.active_domains || 0} 活跃
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-success/30" />
          </div>
        </Card>

        <Card className="p-6 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">SSL 有效</p>
              <p className="font-display text-3xl text-foreground mt-2">
                {loading ? '-' : stats?.ssl_valid_domains || 0}
              </p>
            </div>
            <Activity className="w-10 h-10 text-muted-foreground/30" />
          </div>
        </Card>

        <Card className="p-6 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">严重告警(24h)</p>
              <p className="font-display text-3xl text-error mt-2">
                {loading ? '-' : stats?.critical_alerts_24h || 0}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-error/30" />
          </div>
        </Card>
      </div>

      {/* 7-day uptime indicator */}
      {!loading && stats && stats.avg_uptime_7d !== null && (
        <Card className="p-4 terminal-border">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-matrix" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">7 天平均正常运行时间</p>
              <p className="font-display text-xl text-matrix mt-1">
                {formatUptime(stats.avg_uptime_7d)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {showEmptyState && (
        <Card className="p-12 text-center terminal-card">
          <Monitor className="w-16 h-16 text-matrix/20 mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            系统准备就绪
          </h2>
          <p className="text-muted-foreground text-sm">
            开始添加域名以启动监控
          </p>
        </Card>
      )}
    </div>
  )
}
