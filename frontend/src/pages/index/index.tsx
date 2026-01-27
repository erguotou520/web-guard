import { Monitor, Globe, Activity, AlertTriangle } from 'lucide-react'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import { Link } from 'react-router-dom'

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
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00ff41] flex items-center gap-2 font-mono">
          <Monitor className="w-6 h-6" />
          控制台
        </h1>
        <p className="text-[#888] text-sm mt-1">
          系统概览与监控状态
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 总域名 */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#00ff41] p-6 rounded shadow-[0_0_20px_rgba(0,255,65,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888] mb-2">总域名</p>
              <p className="text-3xl font-bold text-[#00ff41] font-mono">
                {loading ? '-' : stats?.total_domains || 0}
              </p>
            </div>
            <Globe className="w-10 h-10 text-[rgba(0,255,65,0.3)]" />
          </div>
        </div>

        {/* 活跃监控 */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-6 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888] mb-2">活跃监控</p>
              <p className="text-3xl font-bold text-[#e0e0e0] font-mono">
                {loading ? '-' : stats?.active_domains || 0}
              </p>
            </div>
            <Activity className="w-10 h-10 text-[rgba(136,136,136,0.3)]" />
          </div>
        </div>

        {/* 正常运行时间 */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-6 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888] mb-2">正常运行时间</p>
              <p className="text-3xl font-bold text-[#00ff41] font-mono">
                {loading ? '-' : (stats?.avg_uptime_7d !== null && stats?.avg_uptime_7d !== undefined) ? formatUptime(stats.avg_uptime_7d) : '-'}
              </p>
            </div>
            <Activity className="w-10 h-10 text-[rgba(0,255,65,0.3)]" />
          </div>
        </div>

        {/* 严重告警 */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-6 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888] mb-2">严重告警</p>
              <p className="text-3xl font-bold text-[#ff0055] font-mono">
                {loading ? '-' : stats?.critical_alerts_24h || 0}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-[rgba(255,0,85,0.3)]" />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {showEmptyState && (
        <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] p-12 text-center rounded">
          <Monitor className="w-16 h-16 text-[rgba(0,255,65,0.2)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#e0e0e0] mb-2 font-mono">
            系统准备就绪
          </h2>
          <p className="text-sm text-[#888] mb-6">
            开始添加域名和组织以启动监控
          </p>
          <Link
            to="domains"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00ff41] text-black text-sm font-bold font-mono border-none cursor-pointer transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:bg-[#00cc33] hover:shadow-[0_0_30px_rgba(0,255,65,0.5)]"
          >
            <Globe className="w-4 h-4" />
            添加域名
          </Link>
        </div>
      )}
    </div>
  )
}
