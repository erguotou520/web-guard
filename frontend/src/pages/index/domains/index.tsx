import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { DataTable } from '@/components/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge, SSLStatusBadge } from '@/components/StatusBadge'
import {
  Globe,
  Plus,
  Activity,
  Clock,
  Loader2,
  Terminal,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'

// Updated type to match DomainWithStatus from API
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
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>()
  const [newDomainName, setNewDomainName] = useState('')
  const [newDomainUrl, setNewDomainUrl] = useState('')

  // Fetch domains with monitoring status
  const { data: domains = [], loading, refresh } = useRequest(
    async () => {
      const { data, error } = await client.get('/api/domains', {
        query: selectedOrgId ? { org_id: selectedOrgId } : undefined
      })
      if (!error && data?.data) {
        return (data.data as Domain[]) || []
      }
      return []
    },
    {
      refreshDeps: [selectedOrgId],
      pollingInterval: 60000, // Refresh every 60 seconds
    }
  )

  // Fetch organizations for dropdown
  const { data: organizations = [] } = useRequest(async () => {
    const { data, error } = await client.get('/api/organizations')
    if (!error && data?.data) {
      return (data.data as Array<{ id: string; name: string; slug: string }>) || []
    }
    return []
  })

  // Create domain with display_name and url
  const { loading: creating, run: createDomain } = useRequest(
    async () => {
      const { error } = await client.post('/api/domains', {
        query: selectedOrgId ? { org_id: selectedOrgId } : undefined,
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

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const sortedDomains = [...domains].sort((a, b) => {
    const aVal = a[sortColumn as keyof Domain]
    const bVal = b[sortColumn as keyof Domain]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return 0
  })

  const columns = [
    {
      key: 'name',
      title: '域名',
      sortable: true,
      render: (_: any, row: Domain) => (
        <div className="flex items-center gap-3">
          <Globe className={`w-4 h-4 ${row.is_active ? 'text-matrix' : 'text-muted-foreground'}`} />
          <div className="flex flex-col">
            <span className={`font-medium ${row.is_active ? '' : 'text-muted-foreground line-through'}`}>
              {row.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {row.url}
            </span>
          </div>
          {!row.is_active && (
            <Badge variant="outline" className="ml-2">
              已禁用
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'ssl_status',
      title: 'SSL 证书',
      sortable: false,
      render: (_: any, row: Domain) => {
        // Check if SSL data exists
        if (row.ssl_is_valid === null || row.ssl_is_valid === undefined) {
          return <span className="text-xs text-muted-foreground">检查中...</span>
        }
        return (
          <SSLStatusBadge
            isValid={row.ssl_is_valid}
            daysUntilExpiry={row.ssl_days_until_expiry}
          />
        )
      }
    },
    {
      key: 'uptime_status',
      title: '状态与响应',
      sortable: false,
      render: (_: any, row: Domain) => {
        // Check if uptime data exists
        if (row.uptime_is_up === null || row.uptime_is_up === undefined) {
          return <span className="text-xs text-muted-foreground">检查中...</span>
        }

        return (
          <div className="flex items-center gap-3">
            <StatusBadge
              status={row.uptime_is_up ? 'online' : 'offline'}
              text={row.uptime_is_up ? '在线' : '离线'}
            />
            {row.uptime_response_time_ms !== undefined && row.uptime_response_time_ms !== null && (
              <div className="flex items-center gap-1 text-xs font-mono">
                <Zap className={`w-3 h-3 ${row.uptime_response_time_ms < 200 ? 'text-success' : row.uptime_response_time_ms < 500 ? 'text-warning' : 'text-error'}`} />
                <span className={row.uptime_response_time_ms < 200 ? 'text-success' : row.uptime_response_time_ms < 500 ? 'text-warning' : 'text-error'}>
                  {row.uptime_response_time_ms}ms
                </span>
              </div>
            )}
            {row.uptime_status_code && (
              <code className="text-xs px-1.5 py-0.5 bg-muted border border-border">
                {row.uptime_status_code}
              </code>
            )}
          </div>
        )
      }
    },
    {
      key: 'created_at',
      title: '添加时间',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(value), 'yyyy-MM-dd')}
        </span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, row: Domain) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/domains/${row.id}`)}
          >
            详情
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-matrix flex items-center gap-2">
            <Globe className="w-6 h-6" />
            域名监控
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            实时监控域名可用性与SSL证书状态
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Organization Filter */}
          <select
            value={selectedOrgId || ''}
            onChange={(e) => setSelectedOrgId(e.target.value || undefined)}
            className="px-3 py-2 bg-background border border-border text-sm"
          >
            <option value="">全部组织</option>
            {organizations.map((org: any) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <Button
            variant="matrix"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            添加域名
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">总域名</p>
              <p className="font-display text-2xl text-matrix mt-1">{domains.length}</p>
            </div>
            <Globe className="w-8 h-8 text-matrix/50" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">在线</p>
              <p className="font-display text-2xl text-success mt-1">
                {domains.filter(d => d.uptime_is_up === true).length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-success/50" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">SSL有效</p>
              <p className="font-display text-2xl text-success mt-1">
                {domains.filter(d => d.ssl_is_valid === true && d.ssl_is_expired !== true).length}
              </p>
            </div>
            <Terminal className="w-8 h-8 text-success/50" />
          </div>
        </Card>
        <Card className="p-4 terminal-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">SSL即将过期</p>
              <p className="font-display text-2xl text-warning mt-1">
                {domains.filter(d => d.ssl_is_expiring_soon === true && d.ssl_is_expired !== true).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-warning/50" />
          </div>
        </Card>
      </div>

      {/* Domains Table */}
      <Card>
        <DataTable
          columns={columns}
          data={sortedDomains}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          rowKey="id"
          onRowClick={(row) => navigate(`/domains/${row.id}`)}
          className={loading ? 'opacity-50' : ''}
        />
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-matrix" />
          </div>
        )}
        {!loading && domains.length === 0 && (
          <div className="py-12 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">暂无监控域名</p>
            <p className="text-muted-foreground/60 text-xs mt-1">点击"添加域名"开始监控</p>
          </div>
        )}
      </Card>

      {/* Create Domain Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-md terminal-border">
            <div className="p-6 pt-10">
              <h2 className="font-display text-xl text-matrix mb-6 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                添加监控域名
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="domainName">显示名称</Label>
                  <Input
                    id="domainName"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="我的网站"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    用户友好的域名名称
                  </p>
                </div>

                <div>
                  <Label htmlFor="domainUrl">域名地址</Label>
                  <Input
                    id="domainUrl"
                    value={newDomainUrl}
                    onChange={(e) => setNewDomainUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    完整的域名URL地址
                  </p>
                </div>

                <div>
                  <Label htmlFor="orgSelect">所属组织 (可选)</Label>
                  <select
                    id="orgSelect"
                    value={selectedOrgId || ''}
                    onChange={(e) => setSelectedOrgId(e.target.value || undefined)}
                    className="w-full mt-2 px-3 py-2 bg-background border border-border text-sm"
                  >
                    <option value="">默认组织</option>
                    {organizations.map((org: any) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setNewDomainName('')
                      setNewDomainUrl('')
                    }}
                    disabled={creating}
                  >
                    取消
                  </Button>
                  <Button
                    variant="matrix"
                    className="flex-1"
                    onClick={() => createDomain()}
                    disabled={creating || !newDomainName.trim() || !newDomainUrl.trim()}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        添加中...
                      </>
                    ) : (
                      <>
                        <Terminal className="w-4 h-4 mr-2" />
                        执行添加
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
