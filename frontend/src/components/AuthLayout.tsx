import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Shield } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  icon?: LucideIcon
  iconBgColor?: string
  titleColor?: string
  footer?: ReactNode
}

export function AuthLayout({
  children,
  title,
  subtitle,
  icon: Icon = Shield,
  iconBgColor = 'bg-primary text-primary-foreground',
  titleColor = 'text-matrix',
  footer
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-8">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`flex items-center justify-center w-16 h-16 ${iconBgColor}`}>
              <Icon className="w-10 h-10" />
            </div>
          </div>
          <h1 className={`font-display text-3xl ${titleColor} mb-2 animate-matrix`}>
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {subtitle}
          </p>
        </div>

        {/* Form Container */}
        <div className="terminal-border p-8 pt-12">
          {children}
        </div>

        {/* Footer */}
        {footer || (
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>System Status: ONLINE</p>
            <p className="mt-1 font-mono">
              <span className="text-matrix">▓</span> Secure Connection
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
