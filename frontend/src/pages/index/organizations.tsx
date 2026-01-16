import { useState } from 'react'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { DataTable } from '@/components/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
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
    console.log('Organizations API response:', { data, error })
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
      console.log('Members API response:', { data, error })
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
  })

  // Delete organization
  const { loading: deleting, run: deleteOrg } = useRequest(async (id: string) => {
    const { error } = await client.delete('/api/organizations/{id}', {
      params: { id }
    })

    if (!error) {
      refresh()
    }
  })

  // Add member
  const { loading: addingMember, run: addMember } = useRequest(async (email: string, role: 'admin' | 'member') => {
    if (!selectedOrg) return

    const { error } = await client.post('/api/organizations/{id}/members', {
      params: { id: selectedOrg.id },
      body: { email, role }
    })

    if (!error) {
      refreshMembers()
    }
  })

  // Remove member
  const { loading: removingMember, run: removeMember } = useRequest(async (userId: string) => {
    if (!selectedOrg) return

    const { error } = await client.delete('/api/organizations/{id}/members/{user_id}', {
      params: { id: selectedOrg.id, user_id: userId }
    })

    if (!error) {
      refreshMembers()
    }
  })

  // Update member role
  const { loading: updatingRole, run: updateRole } = useRequest(async (userId: string, role: 'admin' | 'member') => {
    if (!selectedOrg) return

    const { error } = await client.put('/api/organizations/{id}/members/{user_id}/role', {
      params: { id: selectedOrg.id, user_id: userId },
      body: { role }
    })

    if (!error) {
      refreshMembers()
    }
  })

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

  const columns = [
    {
      key: 'name',
      title: '组织名称',
      sortable: true,
      render: (_: any, row: Organization) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-matrix" />
          <span className="font-medium">{row.name}</span>
        </div>
      )
    },
    {
      key: 'slug',
      title: '标识符',
      sortable: true,
      render: (value: string) => (
        <code className="text-sm px-2 py-1 bg-muted border border-border">
          {value}
        </code>
      )
    },
    {
      key: 'max_monitors',
      title: '监控限制',
      sortable: true,
      render: (value: number) => (
        <Badge variant="outline">{value} 个</Badge>
      )
    },
    {
      key: 'created_at',
      title: '创建时间',
      sortable: true,
      render: (value: string) => format(new Date(value), 'yyyy-MM-dd HH:mm')
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, row: Organization) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedOrg(row)
              setIsMembersModalOpen(true)
            }}
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteOrg(row.id)}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
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
            <Building2 className="w-6 h-6" />
            组织管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            管理监控组织与成员权限
          </p>
        </div>
        <Button
          variant="matrix"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          创建组织
        </Button>
      </div>

      {/* Organizations Table */}
      <Card>
        <DataTable
          columns={columns}
          data={sortedOrganizations}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          rowKey="id"
          className={loading ? 'opacity-50' : ''}
        />
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-matrix" />
          </div>
        )}
        {!loading && organizations.length === 0 && (
          <div className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">暂无组织</p>
            <p className="text-muted-foreground/60 text-xs mt-1">点击"创建组织"开始</p>
          </div>
        )}
      </Card>

      {/* Create Organization Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-md terminal-border">
            <div className="p-6 pt-10">
              <h2 className="font-display text-xl text-matrix mb-6 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                创建新组织
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">组织名称</Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="My Organization"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="orgSlug">标识符 (可选)</Label>
                  <Input
                    id="orgSlug"
                    value={newOrgSlug}
                    onChange={(e) => setNewOrgSlug(e.target.value)}
                    placeholder="my-org"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    留空则自动生成
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={creating}
                  >
                    取消
                  </Button>
                  <Button
                    variant="matrix"
                    className="flex-1"
                    onClick={() => createOrg()}
                    disabled={creating || !newOrgName.trim()}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Terminal className="w-4 h-4 mr-2" />
                        执行创建
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Members Management Modal */}
      {isMembersModalOpen && selectedOrg && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl terminal-border max-h-[80vh] overflow-hidden">
            <div className="p-6 pt-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl text-matrix flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  成员管理
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMembersModalOpen(false)}
                >
                  ×
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                组织: <span className="text-matrix font-mono">{selectedOrg.name}</span>
              </p>

              {/* Add Member Form */}
              <div className="terminal-border p-4 mb-4 bg-muted/30">
                <h3 className="text-sm font-medium mb-3">添加成员</h3>
                <div className="flex gap-3">
                  <Input
                    placeholder="用户邮箱"
                    id="memberEmail"
                    className="flex-1"
                  />
                  <select
                    id="memberRole"
                    className="px-3 py-2 bg-background border border-border text-sm"
                  >
                    <option value="member">成员</option>
                    <option value="admin">管理员</option>
                  </select>
                  <Button
                    variant="cyan"
                    onClick={() => {
                      const email = (document.getElementById('memberEmail') as HTMLInputElement)?.value
                      const role = (document.getElementById('memberRole') as HTMLSelectElement)?.value as 'admin' | 'member'
                      if (email) {
                        addMember(email, role)
                        ;(document.getElementById('memberEmail') as HTMLInputElement).value = ''
                      }
                    }}
                    disabled={addingMember}
                  >
                    {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-matrix" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无成员
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-border bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={member.role === 'owner' ? 'matrix' : member.role === 'admin' ? 'default' : 'outline'}
                        >
                          {member.role === 'owner' ? '所有者' : member.role === 'admin' ? '管理员' : '成员'}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground">
                          {member.user_id}
                        </span>
                      </div>
                      {member.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={member.role}
                            onChange={(e) => updateRole(member.user_id, e.target.value as 'admin' | 'member')}
                            className="px-2 py-1 text-sm bg-background border border-border"
                            disabled={updatingRole}
                          >
                            <option value="admin">管理员</option>
                            <option value="member">成员</option>
                          </select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMember(member.user_id)}
                            disabled={removingMember}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
