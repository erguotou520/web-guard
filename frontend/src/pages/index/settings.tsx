import { Settings as SettingsIcon, User, Bell, Shield, Terminal } from 'lucide-react'

export default function Settings() {
  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#00ff41] flex items-center gap-2 font-mono">
          <SettingsIcon className="w-6 h-6" />
          系统设置
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          管理账户与应用偏好
        </p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] rounded p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-[#00ff41]" />
            <h2 className="font-mono text-lg text-[#e0e0e0]">个人资料</h2>
          </div>
          <p className="text-[#888888] text-sm">
            管理您的个人信息与显示偏好
          </p>
        </div>

        {/* Notifications Section */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] rounded p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-[#00ffff]" />
            <h2 className="font-mono text-lg text-[#e0e0e0]">通知设置</h2>
          </div>
          <p className="text-[#888888] text-sm">
            配置告警通知方式与频率
          </p>
        </div>

        {/* Security Section */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] rounded p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-[#ff0055]" />
            <h2 className="font-mono text-lg text-[#e0e0e0]">安全设置</h2>
          </div>
          <p className="text-[#888888] text-sm mb-4">
            密码、双因素认证与会话管理
          </p>
          <button className="px-3 py-2 text-sm bg-transparent text-[#00ff41] border border-[#00ff41] cursor-pointer font-mono transition-all hover:bg-[rgba(0,255,65,0.1)] flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            修改密码
          </button>
        </div>

        {/* API Section */}
        <div className="bg-[rgba(10,10,10,0.8)] border border-[#333] rounded p-6">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="w-5 h-5 text-[#ffcc00]" />
            <h2 className="font-mono text-lg text-[#e0e0e0]">API 访问</h2>
          </div>
          <p className="text-[#888888] text-sm">
            管理 API 密钥与访问权限
          </p>
        </div>
      </div>

      {/* Empty State Note */}
      <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] rounded p-8 text-center">
        <Terminal className="w-12 h-12 text-[rgba(0,255,65,0.2)] mx-auto mb-3" />
        <p className="text-[#888888] text-sm">
          设置功能开发中...
        </p>
      </div>
    </div>
  )
}
