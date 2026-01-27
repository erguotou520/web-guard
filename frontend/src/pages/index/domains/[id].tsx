import { useParams, useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import {
  ArrowLeft,
  Globe,
  Activity,
  Clock,
  Shield,
  Loader2,
  Calendar,
  Server,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'

interface DomainDetail {
  id: string
  name: string
  url: string
  normalized_name: string
  organization_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface DomainStatistics {
  latest_is_up?: boolean
  latest_response_time_ms?: number
  latest_status_code?: number
  latest latest_check_time?: string
  uptime_7d?: number
  avg_response_time_7d?: number
  total_checks_7d?: number
  successful_checks_7d?: number
  ssl_is_valid?: boolean
  ssl_days_until_expiry?: number
  ssl_is_expired?: boolean
  ssl_is_expiring_soon?: boolean
}

interface SSLStatus {
  is_valid: boolean
  issuer?: string
  subject?: string
  sans: string[]
  valid_from?: string
  valid_until?: string
  days_until_expiry?: number
  is_expiring_soon: boolean
  is_expired: boolean
  chain_is_valid: boolean
  hostname_matches: boolean
}

interface UptimeHistoryPoint {
  bucket_start: string
  avg_response_time_ms?: number
  max_response_time_ms?: number
  min_response_time_ms?: number
  total_checks: number
  successful_checks: number
  failed_checks: number
}

export default function DomainDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Fetch domain details
  const { data: domain, loading: domainLoading } = useRequest(
    async () => {
      if (!id) return null
      const { data, error } = await client.get('/api/domains/{id}', {
        params: { id }
      })
      if (!error && data) {
        return (data.data || data) as DomainDetail
      }
      return null
    },
    {
      ready: !!id
    }
  )

  // Fetch domain statistics
  const { data: stats, loading: statsLoading } = useRequest(
    async () => {
      if (!id) return null
      const { data, error } = await client.get('/api/domains/{id}/statistics', {
        params: { id }
      })
      if (!error && data?.data) {
        return data.data as DomainStatistics
      }
      return null
    },
    {
      ready: !!id,
      pollingInterval: 60000, // Refresh every 60 seconds
    }
  )

  // Fetch SSL details
  const { data: sslStatus } = useRequest(
    async () => {
      if (!id) return null
      const { data, error } = await client.get('/api/domains/{id}/monitoring/ssl/latest', {
        params: { id }
      })
      if (!error && data) {
        return data.data as SSLStatus
      }
      return null
    },
    {
      ready: !!id,
      pollingInterval: 300000, // Refresh every 5 minutes
    }
  )

  // Fetch uptime history for chart (last 24 hours, 1-hour intervals)
  const { data: uptimeHistory } = useRequest(
    async () => {
      if (!id) return []
      const { data, error } = await client.get('/api/domains/{id}/monitoring/uptime/history', {
        params: { id },
        query: {
          hours: 24,
          interval_minutes: 60
        }
      })
      if (!error && data?.data) {
        return data.data as UptimeHistoryPoint[] || []
      }
      return []
    },
    {
      ready: !!id,
      pollingInterval: 60000, // Refresh every 60 seconds
    }
  )

  if (domainLoading || !domain) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#00ff41]" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const loading = statsLoading

  // Format response time chart data
  const responseTimeData = uptimeHistory?.map((point) => ({
    timestamp: format(new Date(point.bucket_start), 'HH:mm'),
    response_time_ms: point.avg_response_time_ms || 0,
    checks: point.total_checks
  })) || []

  // Calculate uptime trend (dummy for now - would need more complex calculation)
  const uptimeTrendData = uptimeHistory?.slice(-7).map((point) => ({
    date: format(new Date(point.bucket_start), 'MM-dd'),
    uptime: point.total_checks > 0 ? (point.successful_checks / point.total_checks * 100) : 0
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/domains')}
          className="px-3 py-2 bg-[transparent] border border-[#333] text-[#888888] cursor-pointer flex items-center gap-2 text-sm font-mono transition-all hover:border-[#00ff41] hover:text-[#00ff41]"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#00ff41] flex items-center gap-2 font-mono">
              <Globe className="w-6 h-6" />
              {domain.name}
            </h1>
            {domain.is_active ? (
              <span className="px-3 py-1 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] text-[#00ff41] text-xs font-mono">
                监控中
              </span>
            ) : (
              <span className="px-3 py-1 bg-[rgba(136,136,136,0.1)] border border-[#888888] text-[#888888] text-xs font-mono">
                已暂停
              </span>
            )}
          </div>
          <p className="text-[rgba(102,102,102,1)] text-sm mt-1 font-mono">
            {domain.url}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">当前状态</p>
              <div className="mt-2">
                <span className={`text-xs px-2 py-1 border font-mono ${
                  stats?.latest_is_up
                    ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[#00ff41]'
                    : 'bg-[rgba(255,0,85,0.1)] text-[#ff0055] border-[#ff0055]'
                }`}>
                  {stats?.latest_is_up ? '在线' : '离线'}
                </span>
              </div>
            </div>
            <Activity className="w-8 h-8 text-[rgba(0,255,65,0.5)]" />
          </div>
        </div>

        {/* Response Time Card */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">响应时间</p>
              <p className="font-mono text-2xl text-[#00ff41] mt-1">
                {loading ? '-' : stats?.latest_response_time_ms !== undefined ? `${stats.latest_response_time_ms}ms` : '-'}
              </p>
            </div>
            <Zap className="w-8 h-8 text-[rgba(0,255,65,0.5)]" />
          </div>
        </div>

        {/* Uptime Card */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">7天可用率</p>
              <p className="font-mono text-2xl text-[#00ff41] mt-1">
                {loading ? '-' : stats?.uptime_7d !== undefined && stats?.uptime_7d !== null ? `${Number(stats.uptime_7d).toFixed(2)}%` : '-'}
              </p>
            </div>
            <Server className="w-8 h-8 text-[rgba(0,255,65,0.5)]" />
          </div>
        </div>

        {/* SSL Card */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">SSL证书</p>
              <div className="mt-2">
                <span className={`text-xs px-2 py-1 border font-mono ${
                  stats?.ssl_is_valid
                    ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[#00ff41]'
                    : 'bg-[rgba(255,0,85,0.1)] text-[#ff0055] border-[#ff0055]'
                }`}>
                  {stats?.ssl_is_valid ? `有效 (${stats?.ssl_days_until_expiry}天)` : '无效'}
                </span>
              </div>
            </div>
            <Shield className="w-8 h-8 text-[rgba(0,255,65,0.5)]" />
          </div>
        </div>
      </div>

      {/* SSL Certificate Details */}
      {sslStatus && (
        <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] rounded p-6">
          <h3 className="font-mono text-lg text-[#00ff41] mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            SSL 证书详情
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888]">证书状态</span>
                <span className={`text-xs px-2 py-1 border font-mono ${
                  sslStatus.is_valid
                    ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[#00ff41]'
                    : 'bg-[rgba(255,0,85,0.1)] text-[#ff0055] border-[#ff0055]'
                }`}>
                  {sslStatus.is_valid ? '有效' : '无效'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888]">颁发者</span>
                <span className="text-sm font-mono text-[#e0e0e0]">{sslStatus.issuer || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888]">主机名匹配</span>
                <span className={`text-xs px-2 py-1 border font-mono ${
                  sslStatus.hostname_matches
                    ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[#00ff41]'
                    : 'bg-[rgba(255,0,85,0.1)] text-[#ff0055] border-[#ff0055]'
                }`}>
                  {sslStatus.hostname_matches ? '是' : '否'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888]">链验证</span>
                <span className={`text-xs px-2 py-1 border font-mono ${
                  sslStatus.chain_is_valid
                    ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[#00ff41]'
                    : 'bg-[rgba(255,0,85,0.1)] text-[#ff0055] border-[#ff0055]'
                }`}>
                  {sslStatus.chain_is_valid ? '有效' : '无效'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  生效日期
                </span>
                <span className="text-sm font-mono text-[#e0e0e0]">
                  {sslStatus.valid_from ? format(new Date(sslStatus.valid_from), 'yyyy-MM-dd') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  过期日期
                </span>
                <span className={`text-sm font-mono ${
                  sslStatus.is_expired ? 'text-[#ff0055]' : sslStatus.is_expiring_soon ? 'text-[#ffcc00]' : 'text-[#e0e0e0]'
                }`}>
                  {sslStatus.valid_until ? format(new Date(sslStatus.valid_until), 'yyyy-MM-dd') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888]">剩余天数</span>
                <span className={`text-sm font-mono ${
                  sslStatus.days_until_expiry && sslStatus.days_until_expiry < 30 ? 'text-[#ffcc00]' : 'text-[#00ff41]'
                }`}>
                  {sslStatus.days_until_expiry !== undefined ? `${sslStatus.days_until_expiry} 天` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1f1f1f]">
                <span className="text-sm text-[#888]">添加时间</span>
                <span className="text-sm font-mono text-[#e0e0e0]">
                  {domain?.created_at ? format(new Date(domain.created_at), 'yyyy-MM-dd HH:mm') : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uptime Statistics */}
      <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] rounded p-6">
        <h3 className="font-mono text-lg text-[#00ff41] mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          可用性统计 (7天)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-mono text-[#00ff41] mb-1">
              {loading ? '-' : stats?.uptime_7d !== undefined && stats?.uptime_7d !== null ? `${Number(stats.uptime_7d).toFixed(2)}%` : '-'}
            </p>
            <p className="text-xs text-[rgba(102,102,102,1)] mt-1">可用率</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-mono text-[#00ffff] mb-1">
              {loading ? '-' : stats?.avg_response_time_7d !== undefined ? `${stats.avg_response_time_7d}ms` : '-'}
            </p>
            <p className="text-xs text-[rgba(102,102,102,1)] mt-1">平均响应</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-mono text-[#00ff41] mb-1">
              {loading ? '-' : stats?.successful_checks_7d !== undefined ? stats.successful_checks_7d : '-'}
            </p>
            <p className="text-xs text-[rgba(102,102,102,1)] mt-1">成功检查</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-mono text-[#e0e0e0] mb-1">
              {loading ? '-' : stats?.total_checks_7d !== undefined ? stats.total_checks_7d : '-'}
            </p>
            <p className="text-xs text-[rgba(102,102,102,1)] mt-1">总检查次数</p>
          </div>
        </div>
      </div>
    </div>
  )
}
