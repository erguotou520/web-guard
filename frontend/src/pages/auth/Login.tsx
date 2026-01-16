import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import { Terminal, Shield } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'

export default function Login() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { loading, run: login } = useRequest(async () => {
    const { error, data } = await client.post('/api/auth/login', {
      body: { email, password }
    })

    if (!error && data) {
      setToken(data.access_token, data.refresh_token)
      setUser(data.user)
      navigate('/')
    }

    return { error }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login()
  }

  return (
    <AuthLayout
      title="WebGuard"
      subtitle="域名监控系统"
      icon={Shield}
      footer={
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>System Status: ONLINE</p>
          <p className="mt-1 font-mono">
            <span className="text-matrix">▓</span> Secure Connection
          </p>
        </div>
      }
    >
      <h2 className="font-display text-xl mb-6 text-center">
        访问令牌登录
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email">邮箱地址</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            placeholder="•••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          variant="matrix"
          disabled={loading}
        >
          {loading ? (
            <>
              <Terminal className="w-4 h-4 animate-pulse" />
              认证中...
            </>
          ) : (
            <>
              <Terminal className="w-4 h-4" />
              执行登录
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">无访问令牌?</span>{' '}
        <Link to="/auth/register" className="text-matrix hover:underline ml-2">
          申请访问
        </Link>
      </div>
    </AuthLayout>
  )
}
