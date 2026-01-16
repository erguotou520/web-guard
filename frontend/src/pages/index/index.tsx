import { Monitor, Globe, Activity, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function Dashboard() {
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
              <p className="font-display text-3xl text-matrix mt-2">0</p>
            </div>
            <Globe className="w-10 h-10 text-matrix/30" />
          </div>
        </Card>
        <Card className="p-6 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">活跃监控</p>
              <p className="font-display text-3xl text-foreground mt-2">0</p>
            </div>
            <Activity className="w-10 h-10 text-muted-foreground/30" />
          </div>
        </Card>
        <Card className="p-6 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">正常运行时间</p>
              <p className="font-display text-3xl text-success mt-2">-</p>
            </div>
            <Activity className="w-10 h-10 text-success/30" />
          </div>
        </Card>
        <Card className="p-6 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">严重告警</p>
              <p className="font-display text-3xl text-error mt-2">0</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-error/30" />
          </div>
        </Card>
      </div>

      {/* Empty State */}
      <Card className="p-12 text-center terminal-card">
        <Monitor className="w-16 h-16 text-matrix/20 mx-auto mb-4" />
        <h2 className="font-display text-xl text-foreground mb-2">
          系统准备就绪
        </h2>
        <p className="text-muted-foreground text-sm">
          开始添加域名和组织以启动监控
        </p>
      </Card>
    </div>
  )
}
