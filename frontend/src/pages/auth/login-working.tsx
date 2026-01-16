import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function LoginWorking() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '登录失败')
      }

      // 使用 Zustand store 统一管理认证状态
      setToken(data.access_token, data.refresh_token)
      setUser(data.user)
      setSuccess(true)

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (err: any) {
      setError(err.message || '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 20px' }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: '#00ff00',
            marginBottom: '16px',
            borderRadius: '4px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#00ff00',
            marginBottom: '8px',
            fontFamily: 'monospace'
          }}>
            WebGuard
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            域名监控系统
          </p>
        </div>

        {/* Form Container */}
        <div style={{
          background: '#111',
          border: '1px solid #00ff00',
          borderRadius: '4px',
          padding: '32px',
          boxShadow: '0 0 20px rgba(0, 255, 0, 0.1)'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '24px',
            color: '#00ff00',
            fontFamily: 'monospace'
          }}>
            访问令牌登录
          </h2>

          {error && (
            <div style={{
              background: '#ff000020',
              border: '1px solid #ff0000',
              color: '#ff0000',
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#00ff0020',
              border: '1px solid #00ff00',
              color: '#00ff00',
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              ✓ 认证成功！正在跳转...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#ccc',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                邮箱地址
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00ff00'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#ccc',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                密码
              </label>
              <input
                type="password"
                placeholder="•••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00ff00'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#006600' : '#00ff00',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                fontFamily: 'monospace'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#00cc00')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#00ff00')}
            >
              {loading ? '认证中...' : '执行登录'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            <span style={{ color: '#888' }}>无访问令牌?</span>{' '}
            <Link
              to="/auth/register-working"
              style={{
                color: '#00ff00',
                textDecoration: 'none',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              申请访问
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '32px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#666'
        }}>
          <p>System Status: ONLINE</p>
          <p style={{ marginTop: '4px', fontFamily: 'monospace' }}>
            <span style={{ color: '#00ff00' }}>▓</span> Secure Connection
          </p>
        </div>
      </div>
    </div>
  )
}
