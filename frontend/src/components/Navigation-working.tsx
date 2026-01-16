import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import {
  Terminal,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Globe,
  AlertTriangle
} from 'lucide-react'

const navigation = [
  { name: '监控看板', href: '/', icon: Terminal },
  { name: '域名监控', href: '/domains', icon: Globe },
  { name: '告警记录', href: '/alerts', icon: AlertTriangle },
  { name: '设置', href: '/settings', icon: Settings },
]

export function NavigationWorking() {
  const location = useLocation()
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const { isAuthenticated, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    window.location.href = '/auth/login'
  }

  if (!isAuthenticated) return null

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      borderBottom: '1px solid #1f1f1f',
      background: 'rgba(10, 10, 10, 0.9)',
      backdropFilter: 'blur(8px)',
      height: '64px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        {/* Logo */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: '#00ff41',
            color: '#000000'
          }}>
            <Shield style={{ width: '20px', height: '20px' }} />
          </div>
          <span style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: '20px',
            letterSpacing: '0.1em',
            color: '#00ff41',
            textShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
            fontWeight: 'bold'
          }}>
            WebGuard
          </span>
        </Link>

        {/* Navigation Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  color: isActive ? '#00ff41' : '#888888',
                  background: isActive ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                  border: isActive ? '1px solid #00ff41' : '1px solid transparent',
                  fontFamily: 'Fira Code, monospace'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#e0e0e0'
                    e.currentTarget.style.background = 'rgba(26, 26, 26, 1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#888888'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <item.icon style={{ width: '16px', height: '16px' }} />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Right Side */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Organizations Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                color: '#888888',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s',
                fontFamily: 'Fira Code, monospace'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e0e0e0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#888888'
              }}
            >
              <Users style={{ width: '16px', height: '16px' }} />
              <span>组织</span>
              <ChevronDown style={{ width: '16px', height: '16px' }} />
            </button>

            {orgDropdownOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '192px',
                background: '#0a0a0a',
                border: '1px solid #1f1f1f',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                zIndex: 100
              }}>
                <div style={{ padding: '4px 0' }}>
                  <Link
                    to="/organizations"
                    style={{
                      display: 'block',
                      padding: '8px 16px',
                      fontSize: '14px',
                      color: '#888888',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      fontFamily: 'Fira Code, monospace'
                    }}
                    onClick={() => setOrgDropdownOpen(false)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#e0e0e0'
                      e.currentTarget.style.background = '#1a1a1a'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#888888'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    管理组织
                  </Link>
                  <button
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      fontSize: '14px',
                      color: '#888888',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'Fira Code, monospace'
                    }}
                    onClick={() => {
                      setOrgDropdownOpen(false)
                      // Add create org logic
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#e0e0e0'
                      e.currentTarget.style.background = '#1a1a1a'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#888888'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    创建组织
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '14px',
              color: '#888888',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s',
              fontFamily: 'Fira Code, monospace'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff0055'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#888888'
            }}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>
    </nav>
  )
}
