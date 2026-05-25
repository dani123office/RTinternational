import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

const Select = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          'flex h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
          'hover:border-slate-400',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  )
})
Select.displayName = 'Select'

export { Select }
