import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Label = forwardRef(({ className, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium text-slate-700 leading-none',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  >
    {props.children}
    {required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
))
Label.displayName = 'Label'

export { Label }
