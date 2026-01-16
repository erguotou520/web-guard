import { useRequest } from 'ahooks'
import { format } from 'date-fns'
import { useState } from 'react'
import { client } from '../api'

interface StatusBarProps {
  domainId: string
  hours?: number
}

interface StatusCell {
  checkTime: string
  isUp: boolean
  responseTimeMs: number | null
  statusCode: number | null
  errorType: string | null
}

/**
 * StatusBar Component - 48×10 Grid Layout
 *
 * Layout:
 * - 48 big blocks horizontally (one for every 30 minutes in 24 hours)
 * - Each big block contains 10 small rows vertically (3-minute intervals)
 * - Total: 480 data points (24h × 60min / 3min)
 */
export function StatusBar({ domainId, hours = 24 }: StatusBarProps) {
  const [hoveredCell, setHoveredCell] = useState<{ big: number; small: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Fetch data with 3-minute intervals = 480 data points for 24 hours
  const INTERVAL_MINUTES = 3
  const POINTS_PER_BIG_BLOCK = 10 // 30 minutes / 3 minutes = 10 points
  const BIG_BLOCKS_COUNT = 48 // 24 hours × 2 (30-minute blocks)

  const { data: historyData, loading } = useRequest(
    async () => {
      const { data, error } = await client.get(
        '/api/domains/{id}/monitoring/uptime/history',
        {
          params: { id: domainId },
          query: { hours, interval_minutes: INTERVAL_MINUTES },
        }
      )
      if (error) {
        console.error('Failed to fetch monitoring history:', error)
        return []
      }
      return (data || []) as Array<{
        bucket_start: string
        avg_response_time_ms: number | null
        total_checks: number
        successful_checks: number
        failed_checks: number
      }>
    },
    {
      pollingInterval: 60000, // Refresh every 60 seconds
      refreshDeps: [domainId, hours],
    }
  )

  // Convert aggregated API data to individual check points
  const cells: (StatusCell | null)[] = (historyData || [])
    .reverse() // Oldest first
    .map((item) => ({
      checkTime: item.bucket_start,
      isUp: item.successful_checks > 0,
      responseTimeMs: item.avg_response_time_ms,
      statusCode: null,
      errorType: item.failed_checks > 0 ? 'Connection failed' : null,
    }))

  // Calculate expected number of cells
  const expectedCells = (hours * 60) / INTERVAL_MINUTES // 480 for 24 hours

  // Fill missing cells with placeholder data
  const filledCells: (StatusCell | null)[] = Array(expectedCells).fill(null)
  cells.forEach((cell, index) => {
    if (index < expectedCells) {
      const targetIndex = expectedCells - cells.length + index
      if (targetIndex >= 0 && targetIndex < expectedCells) {
        filledCells[targetIndex] = cell
      }
    }
  })

  // Group cells into 48 big blocks, each containing 10 small rows
  const bigBlocks: (StatusCell | null)[][] = []
  for (let i = 0; i < BIG_BLOCKS_COUNT; i++) {
    const startIndex = i * POINTS_PER_BIG_BLOCK
    const endIndex = startIndex + POINTS_PER_BIG_BLOCK
    bigBlocks.push(filledCells.slice(startIndex, endIndex))
  }

  const getCellColor = (cell: StatusCell | null): string => {
    if (!cell) return '#1a1a1a' // Very dark gray for no data
    if (!cell.isUp) return '#ef4444' // Red for down
    if (cell.responseTimeMs && cell.responseTimeMs >= 3000) return '#eab308' // Yellow for slow
    return '#10b981' // Green for up and fast
  }

  const handleMouseEnter = (
    bigIndex: number,
    smallIndex: number,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredCell({ big: bigIndex, small: smallIndex })
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  const handleMouseLeave = () => {
    setHoveredCell(null)
  }

  if (loading && !historyData) {
    return (
      <div className="flex items-center justify-center h-[60px] text-muted-foreground text-sm font-mono">
        Loading monitoring data...
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 48×10 Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(48, 1fr)',
          gap: '4px',
        }}
      >
        {bigBlocks.map((bigBlock, bigIndex) => (
          <div
            key={bigIndex}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}
          >
            {bigBlock.map((cell, smallIndex) => {
              const isHovered =
                hoveredCell?.big === bigIndex && hoveredCell?.small === smallIndex
              return (
                <div
                  key={smallIndex}
                  onMouseEnter={(e) => handleMouseEnter(bigIndex, smallIndex, e)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    height: '4px',
                    background: getCellColor(cell),
                    cursor: cell ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    opacity: isHovered ? 0.7 : 1,
                    transform: isHovered ? 'scaleX(1.05)' : 'scaleX(1)',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredCell !== null && (() => {
        const cell = bigBlocks[hoveredCell.big]?.[hoveredCell.small]
        if (!cell) return null

        const time = new Date(cell.checkTime)
        return (
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
            <div style={{ marginBottom: '4px', color: '#888' }}>
              {format(time, 'yyyy-MM-dd HH:mm')}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div>
                Status:{' '}
                <span style={{ color: cell.isUp ? '#10b981' : '#ef4444' }}>
                  {cell.isUp ? 'UP' : 'DOWN'}
                </span>
              </div>
              {cell.responseTimeMs !== null && (
                <div>
                  Response:{' '}
                  <span
                    style={{
                      color: cell.responseTimeMs >= 3000 ? '#eab308' : '#10b981',
                    }}
                  >
                    {cell.responseTimeMs}ms
                  </span>
                </div>
              )}
              {cell.statusCode !== null && <div>Code: {cell.statusCode}</div>}
            </div>
            {cell.errorType && (
              <div style={{ marginTop: '4px', color: '#ef4444', fontSize: '11px' }}>
                Error: {cell.errorType}
              </div>
            )}
          </div>
        )
      })()}

      {/* Time Labels (showing every 6 hours) */}
      <div
        className="flex justify-between mt-2 text-xs text-muted-foreground font-mono"
        style={{ paddingLeft: '2px', paddingRight: '2px' }}
      >
        <span>{hours}h ago</span>
        <span>{Math.floor(hours * 0.75)}h ago</span>
        <span>{Math.floor(hours * 0.5)}h ago</span>
        <span>{Math.floor(hours * 0.25)}h ago</span>
        <span>Now</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-success rounded-sm" />
          <span>Up</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-warning rounded-sm" />
          <span>Slow (&gt;3s)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-error rounded-sm" />
          <span>Down</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#1a1a1a] rounded-sm border border-border" />
          <span>No data</span>
        </div>
      </div>
    </div>
  )
}
