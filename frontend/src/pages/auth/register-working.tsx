import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterWorking() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('密码不匹配')
      return
    }

    if (password.length < 8) {
      setError('密码至少8位')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '注册失败')
      }

      // 使用 Zustand store 统一管理认证状态
      setToken(data.access_token, data.refresh_token)
      setUser(data.user)
      navigate('/auth/login-working')
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试')
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
            background: '#00ffff',
            marginBottom: '16px',
            borderRadius: '4px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#00ffff',
            marginBottom: '8px',
            fontFamily: 'monospace'
          }}>
            申请访问
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            创建监控账户
          </p>
        </div>

        {/* Form Container */}
        <div style={{
          background: '#111',
          border: '1px solid #00ffff',
          borderRadius: '4px',
          padding: '32px',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '24px',
            color: '#00ffff',
            fontFamily: 'monospace'
          }}>
            新用户注册
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

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#ccc',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                全名（可选）
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
                onFocus={(e) => e.target.style.borderColor = '#00ffff'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
            </div>

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
                onFocus={(e) => e.target.style.borderColor = '#00ffff'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
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
                placeholder="至少8位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
                onFocus={(e) => e.target.style.borderColor = '#00ffff'}
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
                确认密码
              </label>
              <input
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onFocus={(e) => e.target.style.borderColor = '#00ffff'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#006666' : '#00ffff',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                fontFamily: 'monospace'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#00cccc')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#00ffff')}
            >
              {loading ? '创建中...' : '创建账户'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            <span style={{ color: '#888' }}>已有账户?</span>{' '}
            <Link
              to="/auth/login-working"
              style={{
                color: '#00ff00',
                textDecoration: 'none',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              直接登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
