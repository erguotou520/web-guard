import { Bell, CheckCircle, AlertTriangle, Info, Loader2, Clock } from 'lucide-react'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { useAuthStore } from '@/stores/authStore'
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
        return <span className="text-xs px-2 py-1 bg-[rgba(255,0,85,0.1)] border border-[#ff0055] text-[#ff0055] font-mono">严重</span>
      case 'warning':
        return <span className="text-xs px-2 py-1 bg-[rgba(255,204,0,0.1)] border border-[#ffcc00] text-[#ffcc00] font-mono">警告</span>
      case 'info':
        return <span className="text-xs px-2 py-1 bg-[rgba(136,136,136,0.1)] border border-[#888888] text-[#e0e0e0] font-mono">信息</span>
      default:
        return <span className="text-xs px-2 py-1 bg-[rgba(136,136,136,0.1)] border border-[#888888] text-[#e0e0e0] font-mono">{severity}</span>
    }
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#00ff41] flex items-center gap-2 font-mono">
          <Bell className="w-6 h-6" />
          告警中心
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          查看系统告警与通知
        </p>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">全部告警</p>
              <p className="font-mono text-2xl text-[#e0e0e0] mt-1">
                {loading ? '-' : alerts.length}
              </p>
            </div>
            <Bell className="w-8 h-8 text-[rgba(136,136,136,0.3)]" />
          </div>
        </div>
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">严重</p>
              <p className="font-mono text-2xl text-[#ff0055] mt-1">
                {loading ? '-' : criticalCount}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-[rgba(255,0,85,0.3)]" />
          </div>
        </div>
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">警告</p>
              <p className="font-mono text-2xl text-[#ffcc00] mt-1">
                {loading ? '-' : warningCount}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-[rgba(255,204,0,0.3)]" />
          </div>
        </div>
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888]">信息</p>
              <p className="font-mono text-2xl text-[#00ffff] mt-1">
                {loading ? '-' : infoCount}
              </p>
            </div>
            <Info className="w-8 h-8 text-[rgba(0,255,255,0.3)]" />
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] rounded overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-[#00ff41]" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : alerts.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  级别
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  标题
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  类型
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  时间
                </th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-[#1f1f1f] transition-all hover:bg-[rgba(0,255,65,0.05)]">
                  <td className="px-4 py-3">
                    {getSeverityBadge(alert.severity)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-[#e0e0e0]">{alert.title}</div>
                      {alert.description && (
                        <div className="text-xs text-[#888888] mt-1">{alert.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[#e0e0e0] font-mono">
                      {alert.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-[#888888] font-mono">
                      <Clock className="w-4 h-4" />
                      {format(new Date(alert.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-[rgba(0,255,65,0.2)] mx-auto mb-4" />
            <h2 className="font-mono text-xl text-[#e0e0e0] mb-2">
              系统运行正常
            </h2>
            <p className="text-[#888888] text-sm">
              暂无告警信息
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] rounded p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#00ffff] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-mono text-sm text-[#e0e0e0] mb-1">
              告警类型说明
            </h3>
            <ul className="text-xs text-[#888888] space-y-1">
              <li><span className="text-[#ff0055]">●</span> 严重：SSL证书过期、服务宕机等</li>
              <li><span className="text-[#ffcc00]">●</span> 警告：SSL即将即将过期、响应时间过长等</li>
              <li><span className="text-[#00ffff]">●</span> 信息：监控状态变更、系统通知等</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
