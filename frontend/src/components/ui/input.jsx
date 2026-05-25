import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-all duration-150',
        'placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
        'hover:border-slate-400',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
