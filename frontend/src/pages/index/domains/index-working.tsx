import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import {
  Globe,
  Plus,
  Activity,
  Clock,
  Loader2,
  Terminal,
  Zap,
  Shield,
  X
} from 'lucide-react'
import { format } from 'date-fns'

interface Domain {
  id: string
  name: string
  normalized_name: string
  organization_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  ssl_status?: {
    is_valid: boolean
    days_until_expiry?: number
    is_expiring_soon?: boolean
    is_expired?: boolean
  }
  uptime_status?: {
    is_up: boolean
    response_time_ms?: number
    status_code?: number
    consecutive_failures?: number
  }
}

export default function DomainsWorking() {
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>()
  const [newDomainName, setNewDomainName] = useState('')

  // Fetch domains (with optional org_id filter)
  const { data: domainsData, loading, refresh } = useRequest(async () => {
    const { data, error } = await client.get('/api/domains', {
      query: selectedOrgId ? { org_id: selectedOrgId } : undefined
    })
    if (!error && data) {
      // API returns { data: [...] }, extract the array
      return data.data || data
    }
    return null
  })

  const domains = Array.isArray(domainsData) ? domainsData : []

  // Fetch organizations for dropdown
  const { data: organizationsData } = useRequest(async () => {
    const { data, error } = await client.get('/api/organizations')
    if (!error && data) {
      // API returns { data: [...] }, extract the array
      return data.data || data
    }
    return null
  })

  const organizations = Array.isArray(organizationsData) ? organizationsData : []

  // Create domain
  const { loading: creating, run: createDomain } = useRequest(
    async () => {
      const { error } = await client.post('/api/domains', {
        query: selectedOrgId ? { org_id: selectedOrgId } : undefined,
        body: { name: newDomainName }
      })

      if (!error) {
        setIsCreateModalOpen(false)
        setNewDomainName('')
        refresh()
      }
    },
    { manual: true }
  )

  // Delete domain
  const { loading: deleting, run: deleteDomain } = useRequest(
    async (id: string) => {
      const { error } = await client.delete('/api/domains/{id}', {
        params: { id }
      })

      if (!error) {
        refresh()
      }
    },
    { manual: true }
  )

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#00ff41',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'monospace'
          }}>
            <Globe style={{ width: '24px', height: '24px' }} />
            域名监控
          </h1>
          <p style={{
            color: '#888',
            fontSize: '14px',
            marginTop: '4px'
          }}>
            实时监控域名可用性与SSL证书状态
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Organization Filter */}
          <select
            value={selectedOrgId || ''}
            onChange={(e) => setSelectedOrgId(e.target.value || undefined)}
            style={{
              padding: '8px 12px',
              background: '#0a0a0a',
              border: '1px solid #1f1f1f',
              color: '#e0e0e0',
              fontSize: '14px',
              fontFamily: 'monospace',
              cursor: 'pointer'
            }}
          >
            <option value="">全部组织</option>
            {organizations.map((org: any) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#00ff41',
              color: '#000000',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00cc33'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#00ff41'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.3)'
            }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            添加域名
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #00ff41',
          padding: '16px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888' }}>总域名</p>
              <p style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#00ff41',
                fontFamily: 'monospace',
                marginTop: '4px'
              }}>
                {domains.length}
              </p>
            </div>
            <Globe style={{ width: '32px', height: '32px', color: 'rgba(0, 255, 65, 0.5)' }} />
          </div>
        </div>

        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #333',
          padding: '16px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888' }}>在线</p>
              <p style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#00ff41',
                fontFamily: 'monospace',
                marginTop: '4px'
              }}>
                {domains.filter(d => d.uptime_status?.is_up).length}
              </p>
            </div>
            <Activity style={{ width: '32px', height: '32px', color: 'rgba(0, 255, 65, 0.5)' }} />
          </div>
        </div>

        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #333',
          padding: '16px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888' }}>SSL有效</p>
              <p style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#00ff41',
                fontFamily: 'monospace',
                marginTop: '4px'
              }}>
                {domains.filter(d => d.ssl_status?.is_valid && !d.ssl_status.is_expired).length}
              </p>
            </div>
            <Shield style={{ width: '32px', height: '32px', color: 'rgba(0, 255, 65, 0.5)' }} />
          </div>
        </div>

        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #333',
          padding: '16px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888' }}>SSL即将过期</p>
              <p style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffcc00',
                fontFamily: 'monospace',
                marginTop: '4px'
              }}>
                {domains.filter(d => d.ssl_status?.is_expiring_soon && !d.ssl_status.is_expired).length}
              </p>
            </div>
            <Clock style={{ width: '32px', height: '32px', color: 'rgba(255, 204, 0, 0.5)' }} />
          </div>
        </div>
      </div>

      {/* Domains Table */}
      <div style={{
        background: 'rgba(10, 10, 10, 0.8)',
        border: '1px solid rgba(0, 255, 65, 0.3)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px'
          }}>
            <Loader2 style={{
              width: '24px',
              height: '24px',
              color: '#00ff41',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}

        {!loading && domains.length === 0 && (
          <div style={{
            padding: '48px',
            textAlign: 'center'
          }}>
            <Globe style={{
              width: '48px',
              height: '48px',
              color: 'rgba(136, 136, 136, 0.3)',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#888', fontSize: '14px' }}>暂无监控域名</p>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
              点击"添加域名"开始监控
            </p>
          </div>
        )}

        {!loading && domains.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#888',
                  fontWeight: '500',
                  fontFamily: 'monospace'
                }}>
                  域名
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#888',
                  fontWeight: '500',
                  fontFamily: 'monospace'
                }}>
                  SSL证书
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#888',
                  fontWeight: '500',
                  fontFamily: 'monospace'
                }}>
                  状态
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#888',
                  fontWeight: '500',
                  fontFamily: 'monospace'
                }}>
                  添加时间
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#888',
                  fontWeight: '500',
                  fontFamily: 'monospace'
                }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => (
                <tr
                  key={domain.id}
                  style={{
                    borderBottom: '1px solid #1f1f1f',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 65, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  onClick={() => navigate(`/domains/${domain.id}`)}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe style={{
                        width: '16px',
                        height: '16px',
                        color: domain.is_active ? '#00ff41' : '#888'
                      }} />
                      <div>
                        <div style={{
                          fontSize: '14px',
                          color: domain.is_active ? '#e0e0e0' : '#888',
                          fontFamily: 'monospace',
                          textDecoration: domain.is_active ? 'none' : 'line-through'
                        }}>
                          {domain.name}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#666',
                          fontFamily: 'monospace'
                        }}>
                          {domain.normalized_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {!domain.ssl_status ? (
                      <span style={{ fontSize: '12px', color: '#888' }}>检查中...</span>
                    ) : (
                      <span style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        background: domain.ssl_status.is_valid && !domain.ssl_status.is_expired
                          ? 'rgba(0, 255, 65, 0.1)'
                          : 'rgba(255, 0, 85, 0.1)',
                        color: domain.ssl_status.is_valid && !domain.ssl_status.is_expired
                          ? '#00ff41'
                          : '#ff0055',
                        border: `1px solid ${domain.ssl_status.is_valid && !domain.ssl_status.is_expired ? '#00ff41' : '#ff0055'}`,
                        fontFamily: 'monospace'
                      }}>
                        {domain.ssl_status.is_valid && !domain.ssl_status.is_expired
                          ? `有效 (${domain.ssl_status.days_until_expiry}天)`
                          : domain.ssl_status.is_expired
                            ? '已过期'
                            : '无效'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {!domain.uptime_status ? (
                      <span style={{ fontSize: '12px', color: '#888' }}>检查中...</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          background: domain.uptime_status.is_up
                            ? 'rgba(0, 255, 65, 0.1)'
                            : 'rgba(255, 0, 85, 0.1)',
                          color: domain.uptime_status.is_up ? '#00ff41' : '#ff0055',
                          border: `1px solid ${domain.uptime_status.is_up ? '#00ff41' : '#ff0055'}`,
                          fontFamily: 'monospace'
                        }}>
                          {domain.uptime_status.is_up ? '在线' : '离线'}
                        </span>
                        {domain.uptime_status.response_time_ms !== undefined && (
                          <span style={{
                            fontSize: '11px',
                            color: domain.uptime_status.response_time_ms < 200
                              ? '#00ff41'
                              : domain.uptime_status.response_time_ms < 500
                                ? '#ffcc00'
                                : '#ff0055',
                            fontFamily: 'monospace'
                          }}>
                            <Zap style={{
                              width: '12px',
                              height: '12px',
                              display: 'inline',
                              verticalAlign: 'middle'
                            }} />
                            {domain.uptime_status.response_time_ms}ms
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', color: '#888', fontFamily: 'monospace' }}>
                      {format(new Date(domain.created_at), 'yyyy-MM-dd')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/domains/${domain.id}`)
                        }}
                        style={{
                          padding: '4px 12px',
                          fontSize: '12px',
                          background: 'transparent',
                          color: '#00ff41',
                          border: '1px solid #00ff41',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 255, 65, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        详情
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`确定要删除域名 ${domain.name} 吗？`)) {
                            deleteDomain(domain.id)
                          }
                        }}
                        disabled={deleting}
                        style={{
                          padding: '4px 12px',
                          fontSize: '12px',
                          background: 'transparent',
                          color: '#ff0055',
                          border: '1px solid #ff0055',
                          cursor: deleting ? 'not-allowed' : 'pointer',
                          fontFamily: 'monospace',
                          opacity: deleting ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!deleting) {
                            e.currentTarget.style.background = 'rgba(255, 0, 85, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Domain Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#0a0a0a',
              border: '1px solid #00ff41',
              borderRadius: '4px',
              padding: '24px',
              boxShadow: '0 0 30px rgba(0, 255, 65, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#00ff41',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'monospace'
              }}>
                <Terminal style={{ width: '20px', height: '20px' }} />
                添加监控域名
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                color: '#ccc',
                marginBottom: '8px',
                fontFamily: 'monospace'
              }}>
                域名
              </label>
              <input
                type="text"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#000000',
                  border: '1px solid #1f1f1f',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00ff41'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#1f1f1f'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                color: '#ccc',
                marginBottom: '8px',
                fontFamily: 'monospace'
              }}>
                所属组织 (可选)
              </label>
              <select
                value={selectedOrgId || ''}
                onChange={(e) => setSelectedOrgId(e.target.value || undefined)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#000000',
                  border: '1px solid #1f1f1f',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  cursor: 'pointer'
                }}
              >
                <option value="">默认组织</option>
                {organizations.map((org: any) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  background: 'transparent',
                  color: '#888',
                  border: '1px solid #333',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  fontFamily: 'monospace',
                  opacity: creating ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!creating) {
                    e.currentTarget.style.background = 'rgba(51, 51, 51, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                取消
              </button>
              <button
                onClick={() => createDomain()}
                disabled={creating || !newDomainName.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: creating || !newDomainName.trim() ? '#333' : '#00ff41',
                  color: '#000000',
                  border: 'none',
                  cursor: creating || !newDomainName.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: creating || !newDomainName.trim()
                    ? 'none'
                    : '0 0 20px rgba(0, 255, 65, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!creating && newDomainName.trim()) {
                    e.currentTarget.style.background = '#00cc33'
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creating && newDomainName.trim()) {
                    e.currentTarget.style.background = '#00ff41'
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.3)'
                  }
                }}
              >
                {creating ? (
                  <>
                    <Loader2 style={{ width: '16px', height: '16px' }} />
                    添加中...
                  </>
                ) : (
                  <>
                    <Terminal style={{ width: '16px', height: '16px' }} />
                    执行添加
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
