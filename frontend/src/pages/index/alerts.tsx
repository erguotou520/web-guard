import { Bell, CheckCircle, AlertTriangle, Info, Loader2, Clock } from 'lucide-react'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/DataTable'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'

interface Alert {
  id: string
  domain_id: string
  organization_id: string
  type: string
  severity: string
  title: string
  description?: string
  metadata: any
  webhook_success?: boolean
  webhook_status_code?: number
  webhook_sent_at?: string
  created_at: string
}

export default function Alerts() {
  const { currentOrgId } = useAuthStore()

  // Fetch alerts
  const { data: alerts = [], loading } = useRequest(
    async () => {
      if (!currentOrgId) return []

      const { data, error } = await client.get('/api/organizations/{id}/alerts', {
        params: { id: currentOrgId },
        query: { limit: 100 }
      })

      if (!error && data?.data) {
        return (data.data as Alert[]) || []
      }
      return []
    },
    {
      ready: !!currentOrgId,
      refreshDeps: [currentOrgId],
      pollingInterval: 30000, // Refresh every 30 seconds
    }
  )

  // Calculate statistics by severity
  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length
  const infoCount = alerts.filter(a => a.severity === 'info').length

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="error">严重</Badge>
      case 'warning':
        return <Badge variant="warning">警告</Badge>
      case 'info':
        return <Badge variant="default">信息</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const columns = [
    {
      key: 'severity',
      title: '级别',
      sortable: false,
      render: (_: any, row: Alert) => getSeverityBadge(row.severity)
    },
    {
      key: 'title',
      title: '标题',
      sortable: false,
      render: (_: any, row: Alert) => (
        <div>
          <div className="font-medium">{row.title}</div>
          {row.description && (
            <div className="text-xs text-muted-foreground mt-1">{row.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      title: '类型',
      sortable: false,
      render: (value: string) => (
        <code className="text-xs px-2 py-1 bg-muted border border-border">
          {value}
        </code>
      )
    },
    {
      key: 'webhook_status',
      title: 'Webhook状态',
      sortable: false,
      render: (_: any, row: Alert) => {
        if (!row.webhook_sent_at) {
          return <span className="text-xs text-muted-foreground">未发送</span>
        }
        return (
          <div className="flex items-center gap-2">
            {row.webhook_success ? (
              <Badge variant="success">成功</Badge>
            ) : (
              <Badge variant="error">失败</Badge>
            )}
            {row.webhook_status_code && (
              <code className="text-xs px-1.5 py-0.5 bg-muted border border-border">
                {row.webhook_status_code}
              </code>
            )}
          </div>
        )
      }
    },
    {
      key: 'created_at',
      title: '时间',
      sortable: false,
      render: (value: string) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {format(new Date(value), 'yyyy-MM-dd HH:mm:ss')}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl text-matrix flex items-center gap-2">
          <Bell className="w-6 h-6" />
          告警中心
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          查看系统告警与通知
        </p>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">全部告警</p>
              <p className="font-display text-2xl text-foreground mt-1">
                {loading ? '-' : alerts.length}
              </p>
            </div>
            <Bell className="w-8 h-8 text-muted-foreground/30" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">严重</p>
              <p className="font-display text-2xl text-error mt-1">
                {loading ? '-' : criticalCount}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-error/30" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">警告</p>
              <p className="font-display text-2xl text-warning mt-1">
                {loading ? '-' : warningCount}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning/30" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">信息</p>
              <p className="font-display text-2xl text-info mt-1">
                {loading ? '-' : infoCount}
              </p>
            </div>
            <Info className="w-8 h-8 text-info/30" />
          </div>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-matrix" />
          </div>
        ) : alerts.length > 0 ? (
          <DataTable
            columns={columns}
            data={alerts}
            rowKey="id"
          />
        ) : (
          /* Empty State */
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-success/20 mx-auto mb-4" />
            <h2 className="font-display text-xl text-foreground mb-2">
              系统运行正常
            </h2>
            <p className="text-muted-foreground text-sm">
              暂无告警信息
            </p>
          </div>
        )}
      </Card>

      {/* Info Section */}
      <Card className="p-6 terminal-border">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-sm text-foreground mb-1">
              告警类型说明
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><span className="text-error">●</span> 严重：SSL证书过期、服务宕机等</li>
              <li><span className="text-warning">●</span> 警告：SSL即将过期、响应时间过长等</li>
              <li><span className="text-info">●</span> 信息：监控状态变更、系统通知等</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
