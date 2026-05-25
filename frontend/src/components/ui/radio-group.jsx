import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

const RadioGroup = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('flex flex-wrap gap-2.5', className)} role="radiogroup" {...props}>
      {children}
    </div>
  )
})
RadioGroup.displayName = 'RadioGroup'

const RadioGroupItem = forwardRef(({ className, value, id, label, disabled, ...props }, ref) => {
  const uid = useId()
  const itemId = id || uid

  return (
    <div className="flex items-center">
      <input
        type="radio"
        id={itemId}
        value={value}
        disabled={disabled}
        className="peer sr-only"
        ref={ref}
        {...props}
      />
      <label
        htmlFor={itemId}
        className={cn(
          'flex items-center justify-center rounded-lg border bg-white px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer select-none',
          'peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 peer-checked:shadow-sm',
          'hover:border-slate-300 hover:bg-slate-50',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 peer-focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white',
          !label ? 'border-slate-200 text-slate-600' : '',
          className,
        )}
      >
        {label || value}
      </label>
    </div>
  )
})
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }
