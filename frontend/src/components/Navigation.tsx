import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
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

export function Navigation() {
  const location = useLocation()
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const { isAuthenticated, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    window.location.href = '/auth/login'
  }

  if (!isAuthenticated) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-display text-xl tracking-wider text-matrix">
            WebGuard
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navigation.map((item) => {
            // Check for exact match or if current path starts with the item's href
            // This highlights parent routes when on detail pages (e.g., /domains when on /domains/:id)
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href + '/'))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                  isActive
                    ? 'text-matrix border-matrix bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Organizations Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>组织</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border shadow-lg">
                <div className="py-1">
                  <Link
                    to="/organizations"
                    className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => setOrgDropdownOpen(false)}
                  >
                    管理组织
                  </Link>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => {
                      setOrgDropdownOpen(false)
                      // Add create org logic
                    }}
                  >
                    创建组织
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
