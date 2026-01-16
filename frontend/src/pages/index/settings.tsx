import { Settings as SettingsIcon, User, Bell, Shield, Terminal } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl text-matrix flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          系统设置
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          管理账户与应用偏好
        </p>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-6">
        {/* Profile Section */}
        <Card className="terminal-border">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-matrix" />
              <h2 className="font-display text-lg">个人资料</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              管理您的个人信息与显示偏好
            </p>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card className="terminal-border">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-accent" />
              <h2 className="font-display text-lg">通知设置</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              配置告警通知方式与频率
            </p>
          </div>
        </Card>

        {/* Security Section */}
        <Card className="terminal-border">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-error" />
              <h2 className="font-display text-lg">安全设置</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              密码、双因素认证与会话管理
            </p>
            <Button variant="outline" size="sm">
              <Terminal className="w-4 h-4 mr-2" />
              修改密码
            </Button>
          </div>
        </Card>

        {/* API Section */}
        <Card className="terminal-border">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-5 h-5 text-warning" />
              <h2 className="font-display text-lg">API 访问</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              管理 API 密钥与访问权限
            </p>
          </div>
        </Card>
      </div>

      {/* Empty State Note */}
      <Card className="p-8 text-center terminal-card">
        <Terminal className="w-12 h-12 text-matrix/20 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          设置功能开发中...
        </p>
      </Card>
    </div>
  )
}
