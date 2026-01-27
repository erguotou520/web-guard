import { useState } from 'react'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import {
  Building2,
  Plus,
  Users,
  Trash2,
  Loader2,
  Terminal
} from 'lucide-react'
import { format } from 'date-fns'

interface Organization {
  id: string
  name: string
  slug: string
  max_monitors: number
  webhook_url?: string
  created_at: string
  updated_at: string
}

interface OrganizationMember {
  id: string
  user_id: string
  organization_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export default function Organizations() {
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')

  // Fetch organizations
  const { data: organizations = [], loading, refresh } = useRequest(async () => {
    const { data, error } = await client.get('/api/organizations')
    if (!error && data?.data) {
      return (data.data as Organization[]) || []
    }
    return []
  })

  // Fetch members for selected organization
  const { data: members = [], loading: membersLoading, refresh: refreshMembers } = useRequest(
    async () => {
      if (!selectedOrg) return []
      const { data, error } = await client.get('/api/organizations/{id}/members', {
        params: { id: selectedOrg.id }
      })
      if (!error && data?.data) {
        return (data.data as OrganizationMember[]) || []
      }
      return []
    },
    {
      refreshDeps: [selectedOrg]
    }
  )

  // Create organization
  const { loading: creating, run: createOrg } = useRequest(async () => {
    const { error } = await client.post('/api/organizations', {
      body: {
        name: newOrgName,
        slug: newOrgSlug || undefined
      }
    })

    if (!error) {
      setIsCreateModalOpen(false)
      setNewOrgName('')
      setNewOrgSlug('')
      refresh()
    }
  }, { manual: true })

  // Delete organization
  const { loading: deleting, run: deleteOrg } = useRequest(async (id: string) => {
    const { error } = await client.delete('/api/organizations/{id}', {
      params: { id }
    })

    if (!error) {
      refresh()
    }
  }, { manual: true })

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const sortedOrganizations = [...organizations].sort((a, b) => {
    const aVal = a[sortColumn as keyof Organization]
    const bVal = b[sortColumn as keyof Organization]
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return 0
  })

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#00ff41] flex items-center gap-2 font-mono">
            <Building2 className="w-6 h-6" />
            组织管理
          </h1>
          <p className="text-[#888888] text-sm mt-1">
            管理监控组织与成员权限
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00ff41] text-black text-sm font-bold font-mono border-none cursor-pointer transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:bg-[#00cc33] hover:shadow-[0_0_30px_rgba(0,255,65,0.5)]"
        >
          <Plus className="w-4 h-4" />
          创建组织
        </button>
      </div>

      {/* Organizations Table */}
      <div className="bg-[rgba(10,10,10,0.8)] border border-[rgba(0,255,65,0.3)] rounded overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-[#00ff41]" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!loading && organizations.length === 0 && (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-[rgba(136,136,136,0.3)] mx-auto mb-4" />
            <p className="text-[#888888] text-sm">暂无组织</p>
            <p className="text-[rgba(136,136,136,0.6)] text-xs mt-1">
              点击"创建组织"开始
            </p>
          </div>
        )}

        {!loading && organizations.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  组织名称
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  标识符
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  监控限制
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  创建时间
                </th>
                <th className="px-4 py-3 text-left text-xs text-[#888] font-medium font-mono">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedOrganizations.map((org) => (
                <tr key={org.id} className="border-b border-[#1f1f1f] transition-all hover:bg-[rgba(0,255,65,0.05)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#00ff41]" />
                      <span className="text-sm font-medium text-[#e0e0e0] font-mono">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm px-2 py-1 bg-[#1a1a1a] border border-[#333] text-[#e0e0e0] font-mono">
                      {org.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm px-2 py-1 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] text-[#00ff41] font-mono">
                      {org.max_monitors} 个
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-[#888888] font-mono">
                      {format(new Date(org.created_at), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrg(org)
                          setIsMembersModalOpen(true)
                        }}
                        className="px-3 py-1 text-xs bg-transparent text-[#00ffff] border border-[#00ffff] cursor-pointer font-mono transition-all hover:bg-[rgba(0,255,255,0.1)]"
                      >
                        <Users className="w-3 h-3 inline align-middle mr-1" />
                        成员
                      </button>
                      <button
                        onClick={() => deleteOrg(org.id)}
                        disabled={deleting}
                        className="px-3 py-1 text-xs bg-transparent text-[#ff0055] border border-[#ff0055] cursor-pointer font-mono transition-all hover:bg-[rgba(255,0,85,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? (
                          <Loader2 className="w-3 h-3 inline align-middle" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Trash2 className="w-3 h-3 inline align-middle" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Organization Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.8)] flex items-center justify-center z-[1000]"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-[500px] bg-[#0a0a0a] border border-[#00ff41] rounded p-6 shadow-[0_0_30px_rgba(0,255,65,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#00ff41] flex items-center gap-2 font-mono">
                <Terminal className="w-5 h-5" />
                创建新组织
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="bg-transparent border-none text-[#888888] cursor-pointer p-1"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[13px] text-[#ccc] mb-2 font-mono">
                组织名称
              </label>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="My Organization"
                className="w-full px-3 py-2.5 bg-[#000000] border border-[#1f1f1f] text-[#e0e0e0] text-sm font-mono outline-none box-border"
                style={{
                  borderColor: newOrgName ? '#00ff41' : '#1f1f1f'
                }}
              />
            </div>

            <div className="mb-6">
              <label className="block text-[13px] text-[#ccc] mb-2 font-mono">
                标识符 (可选)
              </label>
              <input
                type="text"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                placeholder="my-org"
                className="w-full px-3 py-2.5 bg-[#000000] border border-[#1f1f1f] text-[#e0e0e0] text-sm font-mono outline-none box-border"
                style={{
                  borderColor: newOrgSlug ? '#00ff41' : '#1f1f1f'
                }}
              />
              <p className="text-xs text-[#888888] mt-1">
                留空则自动生成
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                disabled={creating}
                className="flex-1 px-2.5 py-2.5 text-sm bg-transparent text-[#888888] border border-[#333] cursor-pointer font-mono transition-all hover:bg-[rgba(51,51,51,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={() => createOrg()}
                disabled={creating || !newOrgName.trim()}
                className="flex-1 px-2.5 py-2.5 text-sm font-bold bg-[#00ff41] text-black border-none cursor-pointer font-mono flex items-center justify-center gap-2 transition-all disabled:bg-[#333] disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,65,0.3)] disabled:shadow-none hover:bg-[#00cc33] hover:shadow-[0_0_30px_rgba(0,255,65,0.5)]"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} />
                    创建中...
                  </>
                ) : (
                  <>
                    <Terminal className="w-4x4" />
                    执行创建
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Management Modal */}
      {isMembersModalOpen && selectedOrg && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.8)] flex items-center justify-center z-[1000]"
          onClick={() => setIsMembersModalOpen(false)}
        >
          <div
            className="w-full max-w-[600px] bg-[#0a0a0a] border border-[#00ff41] rounded p-6 shadow-[0_0_30px_rgba(0,255,65,0.3)] max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#00ff41] flex items-center gap-2 font-mono">
                <Users className="w-5 h-5" />
                成员管理
              </h2>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="bg-transparent border-none text-[#888888] cursor-pointer p-1"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-[#888888] mb-4">
              组织: <span className="text-[#00ff41] font-mono">{selectedOrg.name}</span>
            </p>

            {/* Members List */}
            <div className="max-h-60 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#00ff41]" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-[#888888] text-sm">
                  暂无成员
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-[#1f1f1f] bg-[#1a1a1a] mb-2 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 border font-mono ${
                        member.role === 'owner'
                          ? 'bg-[rgba(0,255,65,0.1)] text-[#00ff41] border-[#00ff41]'
                          : member.role === 'admin'
                            ? 'bg-[rgba(0,255,255,0.1)] text-[#00ffff] border-[#00ffff]'
                            : 'bg-[rgba(136,136,136,0.1)] text-[#888888] border-[#888888]'
                      }`}>
                        {member.role === 'owner' ? '所有者' : member.role === 'admin' ? '管理员' : '成员'}
                      </span>
                      <span className="text-sm font-mono text-[#888888]">
                        {member.user_id}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
