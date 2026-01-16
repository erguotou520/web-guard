import { Monitor, Globe, Activity, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#00ff41',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'monospace'
        }}>
          <Monitor style={{ width: '24px', height: '24px' }} />
          控制台
        </h1>
        <p style={{
          color: '#888',
          fontSize: '14px',
          marginTop: '4px'
        }}>
          系统概览与监控状态
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* 总域名 */}
        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #00ff41',
          padding: '24px',
          borderRadius: '4px',
          boxShadow: '0 0 20px rgba(0, 255, 65, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>总域名</p>
              <p style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#00ff41',
                fontFamily: 'monospace',
                textShadow: '0 0 10px rgba(0, 255, 65, 0.5)'
              }}>
                0
              </p>
            </div>
            <Globe style={{ width: '40px', height: '40px', color: 'rgba(0, 255, 65, 0.3)' }} />
          </div>
        </div>

        {/* 活跃监控 */}
        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #333',
          padding: '24px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>活跃监控</p>
              <p style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#e0e0e0',
                fontFamily: 'monospace'
              }}>
                0
              </p>
            </div>
            <Activity style={{ width: '40px', height: '40px', color: 'rgba(136, 136, 136, 0.3)' }} />
          </div>
        </div>

        {/* 正常运行时间 */}
        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #333',
          padding: '24px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>正常运行时间</p>
              <p style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#00ff41',
                fontFamily: 'monospace'
              }}>
                -
              </p>
            </div>
            <Activity style={{ width: '40px', height: '40px', color: 'rgba(0, 255, 65, 0.3)' }} />
          </div>
        </div>

        {/* 严重告警 */}
        <div style={{
          background: 'rgba(10, 10, 10, 0.8)',
          border: '1px solid #333',
          padding: '24px',
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>严重告警</p>
              <p style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#ff0055',
                fontFamily: 'monospace'
              }}>
                0
              </p>
            </div>
            <AlertTriangle style={{ width: '40px', height: '40px', color: 'rgba(255, 0, 85, 0.3)' }} />
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div style={{
        background: 'rgba(10, 10, 10, 0.8)',
        border: '1px solid rgba(0, 255, 65, 0.3)',
        padding: '48px',
        textAlign: 'center',
        borderRadius: '4px'
      }}>
        <Monitor style={{
          width: '64px',
          height: '64px',
          color: 'rgba(0, 255, 65, 0.2)',
          margin: '0 auto 16px'
        }} />
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#e0e0e0',
          marginBottom: '8px',
          fontFamily: 'monospace'
        }}>
          系统准备就绪
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#888',
          marginBottom: '24px'
        }}>
          开始添加域名和组织以启动监控
        </p>
        <a
          href="/domains"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: '#00ff41',
            color: '#000000',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            textDecoration: 'none',
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
          <Globe style={{ width: '16px', height: '16px' }} />
          添加域名
        </a>
      </div>
    </div>
  )
}
