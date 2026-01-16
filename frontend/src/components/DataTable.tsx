import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface TableColumn<T> {
  key: string
  title: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  rowKey?: keyof T
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onSort,
  sortColumn,
  sortDirection = 'asc',
  rowKey = 'id' as keyof T,
  onRowClick,
  className,
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-sm font-medium text-muted-foreground',
                  column.sortable && 'cursor-pointer hover:text-foreground transition-colors',
                  column.className
                )}
                onClick={() => {
                  if (column.sortable && onSort) {
                    const direction =
                      sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc'
                    onSort(column.key, direction)
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {column.title}
                  {column.sortable && (
                    <span className="text-muted-foreground">
                      {sortColumn === column.key ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronUp className="w-4 h-4 opacity-30" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row[rowKey] ?? index}
              className={cn(
                'border-b border-border transition-colors hover:bg-muted/50',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3 text-sm', column.className)}
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">暂无数据</p>
        </div>
      )}
    </div>
  )
}
