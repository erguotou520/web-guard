import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'unknown'
  text: string
  className?: string
}

const statusConfig = {
  online: {
    variant: 'success' as const,
    icon: '●',
    glow: 'glow-green',
  },
  offline: {
    variant: 'error' as const,
    icon: '●',
    glow: 'glow-red',
  },
  warning: {
    variant: 'warning' as const,
    icon: '●',
    glow: '',
  },
  unknown: {
    variant: 'outline' as const,
    icon: '○',
    glow: '',
  },
}

export function StatusBadge({ status, text, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border',
        config.variant === 'success' && 'border-success/50 bg-success/10 text-success',
        config.variant === 'error' && 'border-error/50 bg-error/10 text-error',
        config.variant === 'warning' && 'border-warning/50 bg-warning/10 text-warning',
        config.variant === 'outline' && 'border-border bg-muted text-muted-foreground',
        config.glow,
        className
      )}
    >
      <span className="text-xs">{config.icon}</span>
      {text}
    </span>
  )
}

interface SSLStatusBadgeProps {
  isValid: boolean
  daysUntilExpiry?: number
  className?: string
}

export function SSLStatusBadge({ isValid, daysUntilExpiry, className }: SSLStatusBadgeProps) {
  if (!isValid) {
    return (
      <StatusBadge
        status="offline"
        text="无效证书"
        className={className}
      />
    )
  }

  if (daysUntilExpiry === undefined) {
    return (
      <StatusBadge
        status="unknown"
        text="检查中"
        className={className}
      />
    )
  }

  if (daysUntilExpiry < 0) {
    return (
      <StatusBadge
        status="offline"
        text={`已过期 ${Math.abs(daysUntilExpiry)} 天`}
        className={className}
      />
    )
  }

  if (daysUntilExpiry < 7) {
    return (
      <StatusBadge
        status="offline"
        text={`${daysUntilExpiry} 天后过期`}
        className={className}
      />
    )
  }

  if (daysUntilExpiry < 30) {
    return (
      <StatusBadge
        status="warning"
        text={`${daysUntilExpiry} 天后过期`}
        className={className}
      />
    )
  }

  return (
    <StatusBadge
      status="online"
      text={`${daysUntilExpiry} 天后过期`}
      className={className}
    />
  )
}
