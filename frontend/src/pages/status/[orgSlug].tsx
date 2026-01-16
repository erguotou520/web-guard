import { Monitor, CheckCircle, Activity, Shield } from 'lucide-react'
import { useParams } from 'react-router-dom'

export default function PublicStatus() {
  const { orgSlug } = useParams()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 bg-primary text-primary-foreground">
              <Monitor className="w-12 h-12" />
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-matrix mb-3 animate-matrix">
            WebGuard Status
          </h1>
          <p className="text-muted-foreground text-lg">
            {orgSlug ? `Organization: ${orgSlug}` : 'System Status Page'}
          </p>
        </div>

        {/* Status Card */}
        <div className="terminal-card p-8 md:p-12 mb-8">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center justify-center w-16 h-16 bg-success/20 border border-success">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div className="text-left">
              <h2 className="font-display text-2xl text-success mb-1">
                All Systems Operational
              </h2>
              <p className="text-muted-foreground text-sm">
                Last checked: Just now
              </p>
            </div>
          </div>

          {/* Services */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="terminal-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monitoring Service</span>
                <span className="w-3 h-3 bg-success rounded-full animate-pulse"></span>
              </div>
              <p className="text-xs text-muted-foreground">Operational</p>
            </div>
            <div className="terminal-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">SSL Checker</span>
                <span className="w-3 h-3 bg-success rounded-full animate-pulse"></span>
              </div>
              <p className="text-xs text-muted-foreground">Operational</p>
            </div>
            <div className="terminal-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Alert System</span>
                <span className="w-3 h-3 bg-success rounded-full animate-pulse"></span>
              </div>
              <p className="text-xs text-muted-foreground">Operational</p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="terminal-border p-6 text-center">
            <Activity className="w-8 h-8 text-matrix/50 mx-auto mb-2" />
            <p className="font-display text-3xl text-matrix">99.9%</p>
            <p className="text-xs text-muted-foreground mt-1">Uptime (30d)</p>
          </div>
          <div className="terminal-border p-6 text-center">
            <Shield className="w-8 h-8 text-success/50 mx-auto mb-2" />
            <p className="font-display text-3xl text-success">0</p>
            <p className="text-xs text-muted-foreground mt-1">Incidents</p>
          </div>
          <div className="terminal-border p-6 text-center">
            <Monitor className="w-8 h-8 text-accent/50 mx-auto mb-2" />
            <p className="font-display text-3xl text-accent">&lt;100ms</p>
            <p className="text-xs text-muted-foreground mt-1">Avg Response</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p className="font-mono">
            <span className="text-matrix">▓</span> Powered by WebGuard
          </p>
          <p className="mt-1">
            <a href="/" className="text-matrix hover:underline">
              Login to Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
