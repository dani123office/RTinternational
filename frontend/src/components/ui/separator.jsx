import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Separator = forwardRef(({ className, orientation = 'horizontal', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'shrink-0 bg-gray-200',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )}
    {...props}
  />
))
Separator.displayName = 'Separator'

export { Separator }
