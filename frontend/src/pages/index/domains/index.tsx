import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Globe,
  Plus,
  Activity,
  Clock,
  Loader2,
  Terminal,
  Zap,
  X,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface Domain {
  id: string
  name: string // display_name
  url: string // actual URL
  normalized_name: string
  organization_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Monitoring data from API
  uptime_is_up?: boolean | null
  uptime_response_time_ms?: number | null
  uptime_status_code?: number | null
  uptime_consecutive_failures?: number | null
  ssl_is_valid?: boolean | null
  ssl_days_until_expiry?: number | null
  ssl_is_expiring_soon?: boolean | null
  ssl_is_expired?: boolean | null
}

export default function Domains() {
  const navigate = useNavigate()
  const { currentOrgId } = useAuthStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newDomainName, setNewDomainName] = useState('')
  const [newDomainUrl, setNewDomainUrl] = useState('')

  // Fetch domains with monitoring status
  const { data: domains = [], loading, refresh } = useRequest(
    async () => {
      const { data, error } = await client.get('/api/domains', {
        query: currentOrgId ? { org_id: currentOrgId } : undefined
      })
      if (!error && data?.data) {
        return (data.data as Domain[]) || []
      }
      return []
    },
    {
      ready: !!currentOrgId,
      refreshDeps: [currentOrgId],
      pollingInterval: 60000, // Refresh every 60 seconds
    }
  )

  // Create domain with display_name and url
  const { loading: creating, run: createDomain } = useRequest(
    async () => {
      const { error } = await client.post('/api/domains', {
        query: currentOrgId ? { org_id: currentOrgId } : undefined,
        body: {
          display_name: newDomainName,
          url: newDomainUrl
        }
      })

      if (!error) {
        setIsCreateModalOpen(false)
        setNewDomainName('')
        setNewDomainUrl('')
        refresh()
      }
    },
    { manual: true }
  )

  const isFormValid = newDomainName.trim() && newDomainUrl.trim() && currentOrgId

  return (
    <div className="py-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#00ff41] flex items-center gap-3 font-mono tracking-tight">
            <Globe className="w-7 h-7" />
            域名监控站
          </h1>
          <p className="text-[#888888] text-sm mt-1.5 font-medium">
            实时监测全球可用性、SSL 证书及安全配置状态
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#00ff41] text-black text-sm font-bold font-mono transition-all border-none cursor-pointer hover:bg-[#00cc33] active:scale-95 shadow-[0_4px_20px_rgba(0,255,65,0.2)]"
        >
          <Plus className="w-5 h-5" />
          新增监控资源
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-[#111] border border-[#1f1f1f] p-5 rounded-lg group hover:border-[#00ff41] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#666] mb-1 font-bold">Total Domains</p>
              <p className="text-3xl font-bold text-[#e0e0e0] font-mono">{domains.length}</p>
            </div>
            <Globe className="w-10 h-10 text-[#00ff41] opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
        </div>

        <div className="bg-[#111] border border-[#1f1f1f] p-5 rounded-lg group hover:border-[#00ff41] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#666] mb-1 font-bold">Online</p>
              <p className="text-3xl font-bold text-[#00ff41] font-mono">
                {domains.filter(d => d.uptime_is_up).length}
              </p>
            </div>
            <Activity className="w-10 h-10 text-[#00ff41] opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
        </div>

        <div className="bg-[#111] border border-[#1f1f1f] p-5 rounded-lg group hover:border-[#00ff41] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#666] mb-1 font-bold">SSL Valid</p>
              <p className="text-3xl font-bold text-[#e0e0e0] font-mono">
                {domains.filter(d => d.ssl_is_valid && !d.ssl_is_expired).length}
              </p>
            </div>
            <Terminal className="w-10 h-10 text-[#00ff41] opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
        </div>

        <div className="bg-[#111] border border-[#1f1f1f] p-5 rounded-lg group hover:border-[#ffcc00] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#666] mb-1 font-bold">SSL Expiring</p>
              <p className="text-3xl font-bold text-[#ffcc00] font-mono">
                {domains.filter(d => d.ssl_is_expiring_soon && !d.ssl_is_expired).length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-[#ffcc00] opacity-20 group-hover:opacity-40 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Domains Table Container */}
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg overflow-hidden shadow-2xl">
        {loading && (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-8 h-8 text-[#00ff41] animate-spin" />
            <p className="text-[#666] font-mono text-sm">正在加载监控状态...</p>
          </div>
        )}

        {!loading && domains.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center mb-6">
              <Globe className="w-10 h-10 text-[#333]" />
            </div>
            <h3 className="text-lg font-bold text-[#e0e0e0] mb-2 font-mono">暂无监控域名</h3>
            <p className="text-[#666] text-sm max-w-[300px] mb-8">
              尚未添加任何监控资源。点击下方按钮或右上角增加您的第一个监控项。
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#111] text-[#00ff41] border border-[#00ff41] text-sm font-bold font-mono transition-all hover:bg-[rgba(0,255,65,0.05)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              立刻添加
            </button>
          </div>
        )}

        {!loading && domains.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#111] border-b border-[#1f1f1f]">
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#666] font-bold font-mono">
                    监控目标
                  </th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#666] font-bold font-mono">
                    SSL 证书
                  </th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#666] font-bold font-mono">
                    实时状态
                  </th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#666] font-bold font-mono">
                    创建日期
                  </th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-wider text-[#666] font-bold font-mono">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr
                    key={domain.id}
                    className="border-b border-[#111] hover:bg-[rgba(0,255,65,0.02)] transition-colors cursor-pointer group"
                    onClick={() => navigate(`/domains/${domain.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${domain.is_active ? 'bg-[rgba(0,255,65,0.1)]' : 'bg-[#1a1a1a]'}`}>
                          <Globe className={`w-5 h-5 ${domain.is_active ? 'text-[#00ff41]' : 'text-[#666]'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold font-mono ${domain.is_active ? 'text-[#e0e0e0]' : 'text-[#666]'} transition-colors group-hover:text-[#00ff41]`}>
                            {domain.name}
                          </span>
                          <span className="text-[11px] text-[#444] font-mono mt-0.5">
                            {domain.url}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {!domain.ssl_is_valid ? (
                        <div className="flex items-center gap-2 text-[#444] text-[11px] font-mono">
                          <div className="w-2 h-2 rounded-full bg-[#333] animate-pulse"></div>
                          检测中...
                        </div>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 inline-flex font-mono font-bold border rounded uppercase transition-colors ${domain.ssl_is_valid && !domain.ssl_is_expired
                          ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[rgba(0,255,65,0.3)] group-hover:border-[#00ff41]'
                          : 'bg-[rgba(255,0,85,0.1)] text-[#ff0055] border-[rgba(255,0,85,0.3)]'
                          }`}>
                          {domain.ssl_is_valid && !domain.ssl_is_expired
                            ? `Valid / ${domain.ssl_days_until_expiry}D`
                            : domain.ssl_is_expired
                              ? 'Expired'
                              : 'Invalid'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {!domain.uptime_is_up ? (
                        <div className="flex items-center gap-2 text-[#444] text-[11px] font-mono">
                          <div className="w-2 h-2 rounded-full bg-[#333] animate-pulse"></div>
                          同步中...
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 font-mono font-bold border rounded uppercase ${domain.uptime_is_up
                            ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[rgba(0,255,65,0.3)]'
                            : 'bg-[rgba(255,0,85,0.1)] text-[#ff0055] border-[rgba(255,0,85,0.3)]'
                            }`}>
                            {domain.uptime_is_up ? 'Online' : 'Offline'}
                          </span>
                          {domain.uptime_response_time_ms !== undefined && (
                            <span className={`text-[11px] font-mono font-medium flex items-center gap-1 ${domain.uptime_response_time_ms && domain.uptime_response_time_ms < 200
                              ? 'text-[#00ff41]'
                              : domain.uptime_response_time_ms && domain.uptime_response_time_ms < 500
                                ? 'text-[#ffcc00]'
                                : 'text-[#ff0055]'
                              }`}>
                              <Zap className="w-3 h-3" />
                              {domain.uptime_response_time_ms}ms
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[12px] text-[#555] font-mono">
                        {format(new Date(domain.created_at), 'yyyy/MM/dd')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/domains/${domain.id}`)
                        }}
                        className="p-2 text-[#666] hover:text-[#00ff41] transition-colors bg-transparent border-none cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redesigned Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#000000e0] backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsCreateModalOpen(false)}
          />

          {/* Modal Container */}
          <div
            className="relative w-full max-w-[500px] bg-[#0d0d0d] border border-[#1f1f1f] shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#1a1a1a] flex items-center justify-between bg-[#111]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[rgba(0,255,65,0.1)] rounded-lg flex items-center justify-center text-[#00ff41] border border-[rgba(0,255,65,0.2)]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#e0e0e0] font-mono leading-none">添加监控任务</h2>
                  <p className="text-[11px] text-[#666] mt-1.5 font-bold uppercase tracking-widest">Add New Domain Monitor</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-[#444] hover:text-[#ff0055] transition-colors rounded-full hover:bg-[#1a1a1a] border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-10 space-y-8">
              {!currentOrgId && (
                <div className="p-4 bg-[rgba(255,204,0,0.05)] border border-[rgba(255,204,0,0.2)] rounded flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#ffcc00] shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#ffcc00] font-mono">未选择组织</p>
                    <p className="text-xs text-[#888] mt-1 leading-relaxed">
                      请在页面顶部的菜单中选择一个组织。域名监控必须关联到一个有效的组织。
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[12px] font-bold text-[#666] uppercase tracking-wider font-mono">
                  显示名称 / Friendly Name
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    autoFocus
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="例如: 生产环境主站"
                    className="w-full px-4 py-3 bg-[#050505] border border-[#1f1f1f] rounded-lg text-[#e0e0e0] text-sm font-mono placeholder:text-[#333] outline-none transition-all focus:border-[#00ff41] focus:ring-4 focus:ring-[rgba(0,255,65,0.05)] box-border"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse shadow-[0_0_10px_#00ff41]" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[12px] font-bold text-[#666] uppercase tracking-wider font-mono">
                  监控地址 / URL
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={newDomainUrl}
                    onChange={(e) => setNewDomainUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-[#050505] border border-[#1f1f1f] rounded-lg text-[#e0e0e0] text-sm font-mono placeholder:text-[#333] outline-none transition-all focus:border-[#00ff41] focus:ring-4 focus:ring-[rgba(0,255,65,0.05)] box-border"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse shadow-[0_0_10px_#00ff41]" />
                  </div>
                </div>
                <p className="text-[10px] text-[#444] font-medium leading-relaxed">
                  TIP: 系统将自动启用 Uptime 存活检测及 SSL 证书有效期监控。
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-[#0a0a0a] border-t border-[#1a1a1a] flex gap-4">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-transparent border border-[#1f1f1f] text-[#666] font-mono text-sm font-bold hover:bg-[#111] hover:text-[#888] transition-all active:scale-[0.98] cursor-pointer"
              >
                CANCEL/取消
              </button>
              <button
                onClick={() => createDomain()}
                disabled={creating || !isFormValid}
                className={`flex-[1.5] py-3 px-6 rounded-lg text-[#000] font-mono text-sm font-bold border-none transition-all flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer
                  ${isFormValid && !creating
                    ? 'bg-[#00ff41] hover:bg-[#00cc33] shadow-[0_4px_20px_rgba(0,255,65,0.2)]'
                    : 'bg-[#111] text-[#333] cursor-not-allowed'
                  }`}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>EXECUTING...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    <span>执行添加 / RUN ADD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
