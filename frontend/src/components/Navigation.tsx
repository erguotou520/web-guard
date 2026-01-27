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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1f1f1f] bg-[rgba(10,10,10,0.9)] backdrop-blur-md h-16">
      <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 decoration-none">
          <div className="flex items-center justify-center w-8 h-8 bg-[#00ff41] text-black">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-xl tracking-[0.1em] text-[#00ff41] font-bold font-mono">
            WebGuard
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const IconComponent = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-2 px-4 py-2 text-sm decoration-none transition-all font-mono ${isActive
                    ? 'text-[#00ff41] border border-[#00ff41] bg-[rgba(0,255,65,0.1)]'
                    : 'text-[#888888] border border-transparent hover:text-[#e0e0e0] hover:bg-[#1a1a1a]'
                  }`}
              >
                <IconComponent className="w-4 h-4" />
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
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#888888] bg-transparent border-none cursor-pointer transition-all font-mono hover:text-[#e0e0e0]"
            >
              <Users className="w-4 h-4" />
              <span>组织</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] border border-[#1f1f1f] shadow-lg z-[100]">
                <div className="py-1">
                  <Link
                    to="/organizations"
                    className="block px-4 py-2 text-sm text-[#888888] decoration-none transition-all font-mono hover:text-[#e0e0e0] hover:bg-[#1a1a1a]"
                    onClick={() => setOrgDropdownOpen(false)}
                  >
                    管理组织
                  </Link>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-[#888888] bg-transparent border-none cursor-pointer transition-all font-mono hover:text-[#e0e0e0] hover:bg-[#1a1a1a]"
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
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#888888] bg-[transparent] border-none cursor-pointer transition-all font-mono hover:text-[#ff0055]"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  )
}
