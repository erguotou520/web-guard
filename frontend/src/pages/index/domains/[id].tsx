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
  normalized_name: string
  organization_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SSLStatus {
  is_valid: boolean
  issuer?: string
  subject?: string
  sans?: string[]
  valid_from?: string
  valid_until?: string
  days_until_expiry?: number
  is_expiring_soon: boolean
  is_expired: boolean
  chain_is_valid: boolean
  hostname_matches: boolean
}

interface UptimeStatus {
  is_up: boolean
  status_code?: number
  response_time_ms?: number
  error_type?: string
  consecutive_failures: number
}

interface UptimeAggregate {
  period_start: string
  period_end: string
  uptime_percentage: number
  avg_response_time_ms?: number
  total_checks: number
  successful_checks: number
}

interface ResponseTimePoint {
  timestamp: string
  response_time_ms: number
  status_code: number
}

export default function DomainDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Fetch domain details
  const { data: domain, loading: domainLoading } = useRequest(async () => {
    if (!id) return null
    const { data, error } = await client.get('/api/domains/{id}', {
      params: { id }
    })
    if (!error && data) {
      // API returns { data: {...} }, extract the object
      return (data.data || data) as DomainDetail
    }
    return null
  })

  // Mock monitoring data (replace with actual API calls when available)
  const sslStatus: SSLStatus = {
    is_valid: true,
    issuer: "Let's Encrypt",
    subject: 'example.com',
    sans: ['example.com', 'www.example.com'],
    valid_from: '2024-01-15T00:00:00Z',
    valid_until: '2025-01-15T00:00:00Z',
    days_until_expiry: 30,
    is_expiring_soon: false,
    is_expired: false,
    chain_is_valid: true,
    hostname_matches: true
  }

  const uptimeStatus: UptimeStatus = {
    is_up: true,
    status_code: 200,
    response_time_ms: 145,
    error_type: undefined,
    consecutive_failures: 0
  }

  // Mock response time data for the chart
  const responseTimeData: ResponseTimePoint[] = [
    { timestamp: '00:00', response_time_ms: 142, status_code: 200 },
    { timestamp: '04:00', response_time_ms: 138, status_code: 200 },
    { timestamp: '08:00', response_time_ms: 156, status_code: 200 },
    { timestamp: '12:00', response_time_ms: 189, status_code: 200 },
    { timestamp: '16:00', response_time_ms: 145, status_code: 200 },
    { timestamp: '20:00', response_time_ms: 167, status_code: 200 },
  ]

  // Mock uptime aggregate data
  const uptimeAggregate: UptimeAggregate = {
    period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    uptime_percentage: 99.95,
    avg_response_time_ms: 156,
    total_checks: 1008,
    successful_checks: 1007
  }

  // Mock uptime trend data
  const uptimeTrendData = [
    { date: '01-09', uptime: 99.8 },
    { date: '01-10', uptime: 99.9 },
    { date: '01-11', uptime: 100 },
    { date: '01-12', uptime: 99.7 },
    { date: '01-13', uptime: 99.95 },
    { date: '01-14', uptime: 100 },
    { date: '01-15', uptime: 99.95 },
  ]

  if (domainLoading || !domain) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-matrix" />
      </div>
    )
  }

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
            {domain.normalized_name}
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
                <StatusBadge
                  status={uptimeStatus.is_up ? 'online' : 'offline'}
                  text={uptimeStatus.is_up ? '在线' : '离线'}
                />
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
                {uptimeStatus.response_time_ms}ms
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
                {uptimeAggregate.uptime_percentage.toFixed(2)}%
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
                <SSLStatusBadge
                  isValid={sslStatus.is_valid}
                  daysUntilExpiry={sslStatus.days_until_expiry}
                />
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
            响应时间趋势
          </h3>
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
        </Card>

        {/* Uptime Trend Chart */}
        <Card className="p-6 terminal-border">
          <h3 className="font-display text-lg text-matrix mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" />
            可用率趋势 (7天)
          </h3>
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
                domain={[99, 100.1]}
                label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #00ffff',
                  borderRadius: 0
                }}
                formatter={(value) => [`${value}%`, '可用率']}
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
        </Card>
      </div>

      {/* SSL Certificate Details */}
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
              <span className="text-sm font-mono">{sslStatus.issuer}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">主体</span>
              <span className="text-sm font-mono">{sslStatus.subject}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">主机名匹配</span>
              <Badge variant={sslStatus.hostname_matches ? 'success' : 'error'}>
                {sslStatus.hostname_matches ? '是' : '否'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">链验证</span>
              <Badge variant={sslStatus.chain_is_valid ? 'success' : 'error'}>
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

      {/* Uptime Statistics */}
      <Card className="p-6 terminal-border">
        <h3 className="font-display text-lg text-matrix mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          可用性统计
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-display text-matrix">
              {uptimeAggregate.uptime_percentage.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">可用率</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display text-cyan">
              {uptimeAggregate.avg_response_time_ms}ms
            </p>
            <p className="text-xs text-muted-foreground mt-1">平均响应</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display text-success">
              {uptimeAggregate.successful_checks}
            </p>
            <p className="text-xs text-muted-foreground mt-1">成功检查</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display">
              {uptimeAggregate.total_checks}
            </p>
            <p className="text-xs text-muted-foreground mt-1">总检查次数</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
