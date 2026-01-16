import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useRequest } from 'ahooks'
import { client } from '@/api'
import { useAuthStore } from '@/stores/authStore'
import { Shield, UserPlus } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'

export default function Register() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { loading, run: register } = useRequest(async () => {
    if (password !== confirmPassword) {
      return { error: true, message: '密码不匹配' }
    }

    if (password.length < 8) {
      return { error: true, message: '密码至少8位' }
    }

    const { error, data } = await client.post('/api/auth/register', {
      body: { email, password, full_name: fullName || undefined }
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
    register()
  }

  return (
    <AuthLayout
      title="申请访问"
      subtitle="创建监控账户"
      icon={UserPlus}
      iconBgColor="bg-accent text-accent-foreground"
      titleColor="text-cyan"
    >
      <h2 className="font-display text-xl mb-6 text-center">
        新用户注册
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="fullName">全名（可选）</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-2"
          />
        </div>

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
            placeholder="至少8位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">确认密码</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-2"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          variant="cyan"
          disabled={loading}
        >
          {loading ? (
            <>
              <Shield className="w-4 h-4 animate-pulse" />
              创建中...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              创建账户
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">已有账户?</span>{' '}
        <Link to="/auth/login" className="text-matrix hover:underline ml-2">
          直接登录
        </Link>
      </div>
    </AuthLayout>
  )
}
