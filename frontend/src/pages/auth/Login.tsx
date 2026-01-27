import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
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
        throw new Error(data.error?.message || data.message || '登录失败')
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-[400px] p-5">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00ff41] mb-4 rounded">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-[30px] font-bold text-[#00ff41] mb-2 font-mono">
            WebGuard
          </h1>
          <p className="text-[#888888] text-sm">
            域名监控系统
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#111] border border-[#00ff41] rounded p-8" style={{ boxShadow: '0 0 20px rgba(0,255,65,0.1)' }}>
          <h2 className="text-[20px] font-semibold text-center mb-6 text-[#00ff41] font-mono">
            访问令牌登录
          </h2>

          {error && (
            <div className="bg-[rgba(255,0,0,0.125)] border border-[#ff0000] text-[#ff0000] p-3 mb-5 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[rgba(0,255,0,0.125)] border border-[#00ff41] text-[#00ff41] p-3 mb-5 rounded text-sm font-mono">
              ✓ 认证成功！正在跳转...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-[#ccc] text-sm mb-2 font-medium">
                邮箱地址
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded text-[#fff] text-sm outline-none transition-colors box-border"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[#ccc] text-sm mb-2 font-medium">
                密码
              </label>
              <input
                type="password"
                placeholder="•••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded text-[#fff] text-sm outline-none transition-colors box-border"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-3 py-3 bg-[#00ff41] text-black border-none rounded text-sm font-bold cursor-pointer font-mono disabled:bg-[#333] disabled:cursor-not-allowed"
            >
              {loading ? '认证中...' : '执行登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-[#888888]">无访问令牌?</span>{' '}
            <Link
              to="/auth/register"
              className="text-[#00ff41] decoration-none ml-2"
            >
              申请访问
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[rgba(102,102,102,1)]">
          <p>System Status: ONLINE</p>
          <p className="mt-1 font-mono">
            <span className="text-[#00ff41]">▓</span> Secure Connection
          </p>
        </div>
      </div>
    </div>
  )
}
