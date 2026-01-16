import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border border-transparent bg-primary text-primary-foreground',
        success: 'border border-transparent bg-success text-white',
        warning: 'border border-transparent bg-warning text-black',
        error: 'border border-transparent bg-error text-white',
        info: 'border border-transparent bg-info text-black',
        outline: 'text-foreground border border-border',
        matrix: 'border border-matrix bg-matrix/10 text-matrix glow-green',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
