import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function Alerts() {
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
              <p className="font-display text-2xl text-foreground mt-1">0</p>
            </div>
            <Bell className="w-8 h-8 text-muted-foreground/30" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">严重</p>
              <p className="font-display text-2xl text-error mt-1">0</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-error/30" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">警告</p>
              <p className="font-display text-2xl text-warning mt-1">0</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning/30" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">已解决</p>
              <p className="font-display text-2xl text-success mt-1">0</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success/30" />
          </div>
        </Card>
      </div>

      {/* Empty State */}
      <Card className="p-12 text-center terminal-card">
        <CheckCircle className="w-16 h-16 text-success/20 mx-auto mb-4" />
        <h2 className="font-display text-xl text-foreground mb-2">
          系统运行正常
        </h2>
        <p className="text-muted-foreground text-sm">
          暂无告警信息
        </p>
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
