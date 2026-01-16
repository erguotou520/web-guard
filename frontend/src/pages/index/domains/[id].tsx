import { useParams, useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge, SSLStatusBadge } from '@/components/StatusBadge'
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
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

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
  latest_check_time?: string
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
        return data as SSLStatus
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
      if (!error && data) {
        return (data as UptimeHistoryPoint[]) || []
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
        <Loader2 className="w-8 h-8 animate-spin text-matrix" />
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
  const uptimeTrendData = uptimeHistory?.slice(-7).map((point, idx) => ({
    date: format(new Date(point.bucket_start), 'MM-dd'),
    uptime: point.total_checks > 0 ? (point.successful_checks / point.total_checks * 100) : 0
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/domains')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl text-matrix flex items-center gap-2">
              <Globe className="w-6 h-6" />
              {domain.name}
            </h1>
            {domain.is_active ? (
              <Badge variant="success" className="ml-2">监控中</Badge>
            ) : (
              <Badge variant="outline" className="ml-2">已暂停</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            {domain.url}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">当前状态</p>
              <div className="mt-2">
                {loading || stats?.latest_is_up === null || stats?.latest_is_up === undefined ? (
                  <span className="text-xs text-muted-foreground">检查中...</span>
                ) : (
                  <StatusBadge
                    status={stats.latest_is_up ? 'online' : 'offline'}
                    text={stats.latest_is_up ? '在线' : '离线'}
                  />
                )}
              </div>
            </div>
            <Activity className="w-8 h-8 text-matrix/50" />
          </div>
        </Card>

        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">响应时间</p>
              <p className="font-display text-2xl text-matrix mt-1">
                {loading ? '-' : stats?.latest_response_time_ms !== undefined ? `${stats.latest_response_time_ms}ms` : '-'}
              </p>
            </div>
            <Zap className="w-8 h-8 text-matrix/50" />
          </div>
        </Card>

        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">7天可用率</p>
              <p className="font-display text-2xl text-success mt-1">
                {loading ? '-' : stats?.uptime_7d !== undefined && stats?.uptime_7d !== null ? `${Number(stats.uptime_7d).toFixed(2)}%` : '-'}
              </p>
            </div>
            <Server className="w-8 h-8 text-success/50" />
          </div>
        </Card>

        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">SSL证书</p>
              <div className="mt-2">
                {loading || stats?.ssl_is_valid === null || stats?.ssl_is_valid === undefined ? (
                  <span className="text-xs text-muted-foreground">检查中...</span>
                ) : (
                  <SSLStatusBadge
                    isValid={stats.ssl_is_valid}
                    daysUntilExpiry={stats.ssl_days_until_expiry}
                  />
                )}
              </div>
            </div>
            <Shield className="w-8 h-8 text-success/50" />
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <Card className="p-6 terminal-border">
          <h3 className="font-display text-lg text-matrix mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            响应时间趋势 (24小时)
          </h3>
          {responseTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #00ff41',
                    borderRadius: 0
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="response_time_ms"
                  stroke="#00ff41"
                  strokeWidth={2}
                  dot={{ fill: '#00ff41', r: 4 }}
                  activeDot={{ r: 6, stroke: '#00ff41', strokeWidth: 2 }}
                  name="响应时间"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              暂无数据
            </div>
          )}
        </Card>

        {/* Uptime Trend Chart */}
        <Card className="p-6 terminal-border">
          <h3 className="font-display text-lg text-matrix mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" />
            可用率趋势
          </h3>
          {uptimeTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={uptimeTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #00ffff',
                    borderRadius: 0
                  }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, '可用率']}
                />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#00ffff"
                  fill="#00ffff"
                  fillOpacity={0.2}
                  name="可用率"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              暂无数据
            </div>
          )}
        </Card>
      </div>

      {/* SSL Certificate Details */}
      {sslStatus && (
        <Card className="p-6 terminal-border">
          <h3 className="font-display text-lg text-matrix mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            SSL 证书详情
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">证书状态</span>
                <SSLStatusBadge
                  isValid={sslStatus.is_valid}
                  daysUntilExpiry={sslStatus.days_until_expiry}
                />
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">颁发者</span>
                <span className="text-sm font-mono">{sslStatus.issuer || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">主体</span>
                <span className="text-sm font-mono">{sslStatus.subject || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">主机名匹配</span>
                <Badge variant={sslStatus.hostname_matches ? 'success' : 'error'} style={{ lineHeight: '1.5' }}>
                  {sslStatus.hostname_matches ? '是' : '否'}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">链验证</span>
                <Badge variant={sslStatus.chain_is_valid ? 'success' : 'error'} style={{ lineHeight: '1.5' }}>
                  {sslStatus.chain_is_valid ? '有效' : '无效'}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  生效日期
                </span>
                <span className="text-sm font-mono">
                  {sslStatus.valid_from ? format(new Date(sslStatus.valid_from), 'yyyy-MM-dd') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  过期日期
                </span>
                <span className={`text-sm font-mono ${sslStatus.is_expired ? 'text-error' : sslStatus.is_expiring_soon ? 'text-warning' : ''}`}>
                  {sslStatus.valid_until ? format(new Date(sslStatus.valid_until), 'yyyy-MM-dd') : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">剩余天数</span>
                <span className={`text-sm font-mono ${sslStatus.days_until_expiry && sslStatus.days_until_expiry < 30 ? 'text-warning' : 'text-success'}`}>
                  {sslStatus.days_until_expiry !== undefined ? `${sslStatus.days_until_expiry} 天` : '-'}
                </span>
              </div>

              {sslStatus.sans && sslStatus.sans.length > 0 && (
                <div className="py-2">
                  <span className="text-sm text-muted-foreground block mb-2">SAN 域名:</span>
                  <div className="flex flex-wrap gap-2">
                    {sslStatus.sans.map((san, idx) => (
                      <code key={idx} className="text-xs px-2 py-1 bg-muted border border-border">
                        {san}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Uptime Statistics */}
      <Card className="p-6 terminal-border">
        <h3 className="font-display text-lg text-matrix mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          可用性统计 (7天)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-display text-matrix">
              {loading ? '-' : stats?.uptime_7d !== undefined && stats?.uptime_7d !== null ? `${Number(stats.uptime_7d).toFixed(2)}%` : '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">可用率</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display text-cyan">
              {loading ? '-' : stats?.avg_response_time_7d !== undefined ? `${stats.avg_response_time_7d}ms` : '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">平均响应</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display text-success">
              {loading ? '-' : stats?.successful_checks_7d !== undefined ? stats.successful_checks_7d : '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">成功检查</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display">
              {loading ? '-' : stats?.total_checks_7d !== undefined ? stats.total_checks_7d : '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">总检查次数</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
