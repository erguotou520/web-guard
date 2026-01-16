import { useRequest } from 'ahooks'
import { format } from 'date-fns'
import { useState } from 'react'
import { client } from '../api'

interface StatusBarProps {
  domainId: string
  hours?: number
  intervalMinutes?: number
}

interface StatusBlock {
  checkTime: string
  isUp: boolean
  responseTimeMs: number | null
  statusCode: number | null
  errorType: string | null
}

export function StatusBar({ domainId, hours = 24, intervalMinutes = 30 }: StatusBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const { data: historyData, loading } = useRequest(
    async () => {
      const { data, error } = await client.get(
        '/api/domains/{id}/monitoring/uptime/history',
        {
          params: { id: domainId },
          query: { hours, interval_minutes: intervalMinutes },
        }
      )
      if (error) {
        console.error('Failed to fetch monitoring history:', error)
        return []
      }
      return (data?.data || []) as Array<{
        check_time: string
        is_up: boolean
        response_time_ms: number | null
        status_code: number | null
        error_type: string | null
      }>
    },
    {
      pollingInterval: 60000, // Refresh every 60 seconds
      refreshDeps: [domainId, hours, intervalMinutes],
    }
  )

  // Convert API data to blocks (reverse to show oldest first)
  const blocks: StatusBlock[] = (historyData || [])
    .reverse()
    .map((item) => ({
      checkTime: item.check_time,
      isUp: item.is_up,
      responseTimeMs: item.response_time_ms,
      statusCode: item.status_code,
      errorType: item.error_type,
    }))

  // Calculate expected number of blocks
  const expectedBlocks = (hours * 60) / intervalMinutes

  // Fill missing blocks with placeholder data
  const filledBlocks: (StatusBlock | null)[] = Array(expectedBlocks).fill(null)
  blocks.forEach((block, index) => {
    if (index < expectedBlocks) {
      filledBlocks[expectedBlocks - blocks.length + index] = block
    }
  })

  const getBlockColor = (block: StatusBlock | null): string => {
    if (!block) return '#2a2a2a' // Gray for no data
    if (!block.isUp) return '#ef4444' // Red for down
    if (block.responseTimeMs && block.responseTimeMs >= 3000) return '#eab308' // Yellow for slow
    return '#10b981' // Green for up and fast
  }

  const handleMouseEnter = (index: number, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredIndex(index)
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  if (loading && !historyData) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60px',
          color: '#666',
          fontSize: '14px',
          fontFamily: 'monospace',
        }}
      >
        Loading monitoring data...
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'flex-end',
          height: '40px',
          overflow: 'hidden',
        }}
      >
        {filledBlocks.map((block, index) => (
          <div
            key={index}
            onMouseEnter={(e) => handleMouseEnter(index, e)}
            onMouseLeave={handleMouseLeave}
            style={{
              flex: '1 1 0',
              minWidth: '0',
              height: '40px',
              background: getBlockColor(block),
              borderRadius: '2px',
              cursor: block ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              opacity: hoveredIndex === index ? 0.8 : 1,
              transform: hoveredIndex === index ? 'scaleY(1.1)' : 'scaleY(1)',
            }}
          />
        ))}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && filledBlocks[hoveredIndex] && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#00ff41',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {(() => {
            const block = filledBlocks[hoveredIndex]
            if (!block) return null
            const time = new Date(block.checkTime)
            return (
              <>
                <div style={{ marginBottom: '4px', color: '#888' }}>
                  {format(time, 'yyyy-MM-dd HH:mm')}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div>
                    Status: <span style={{ color: block.isUp ? '#10b981' : '#ef4444' }}>
                      {block.isUp ? 'UP' : 'DOWN'}
                    </span>
                  </div>
                  {block.responseTimeMs !== null && (
                    <div>
                      Response: <span style={{
                        color: block.responseTimeMs >= 3000 ? '#eab308' : '#10b981'
                      }}>
                        {block.responseTimeMs}ms
                      </span>
                    </div>
                  )}
                  {block.statusCode !== null && (
                    <div>Code: {block.statusCode}</div>
                  )}
                </div>
                {block.errorType && (
                  <div style={{ marginTop: '4px', color: '#ef4444', fontSize: '11px' }}>
                    Error: {block.errorType}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '12px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#666',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#10b981',
              borderRadius: '2px',
            }}
          />
          <span>Up</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#eab308',
              borderRadius: '2px',
            }}
          />
          <span>Slow (&gt;3s)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#ef4444',
              borderRadius: '2px',
            }}
          />
          <span>Down</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#2a2a2a',
              borderRadius: '2px',
            }}
          />
          <span>No data</span>
        </div>
      </div>
    </div>
  )
}
