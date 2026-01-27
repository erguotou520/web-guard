import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function Register() {
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
        throw new Error(data.error?.message || data.message || '注册失败')
      }

      // 使用 Zustand store 统一管理认证状态
      setToken(data.access_token, data.refresh_token)
      setUser(data.user)
      navigate('/auth/login')
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-[400px] p-5">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00ffff] mb-4 rounded">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 4 4H5a4 4 0 0 4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 className="text-[30px] font-bold text-[#00ffff] mb-2 font-mono">
            申请访问
          </h1>
          <p className="text-[#888888] text-sm">
            创建监控账户
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#111] border border-[#00ffff] rounded p-8" style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)' }}>
          <h2 className="text-[20px] font-semibold text-center mb-6 text-[#00ffff] font-mono">
            新用户注册
          </h2>

          {error && (
            <div className="bg-[rgba(255,0,0,0.125)] border border-[#ff0000] text-[#ff0000] p-3 mb-5 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-[#ccc] text-sm mb-2 font-medium">
                全名（可选）
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded text-[#fff] text-sm outline-none transition-colors box-border"
              />
            </div>

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

            <div className="mb-5">
              <label className="block text-[#ccc] text-sm mb-2 font-medium">
                密码
              </label>
              <input
                type="password"
                placeholder="至少8位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded text-[#fff] text-sm outline-none transition-colors box-border"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[#ccc] text-sm mb-2 font-medium">
                确认密码
              </label>
              <input
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded text-[#fff] text-sm outline-none transition-colors box-border"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-3 py-3 bg-[#00ffff] text-black border-none rounded text-sm font-bold cursor-pointer font-mono disabled:bg-[#333] disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建账户'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-[#888888]">已有账户?</span>{' '}
            <Link
              to="/auth/login"
              className="text-[#00ff41] decoration-none ml-2"
            >
              直接登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
