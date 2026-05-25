import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

const Switch = forwardRef(({ className, label, checked, onCheckedChange, disabled, ...props }, ref) => {
  const id = useId()

  return (
    <label
      className={cn(
        'inline-flex items-center gap-3 cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      htmlFor={id}
    >
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'w-[42px] h-6 rounded-full relative transition-colors duration-200',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-300 peer-focus-visible:ring-offset-2',
            checked ? 'bg-indigo-600' : 'bg-slate-200',
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200',
              checked && 'translate-x-[18px]',
            )}
          />
        </div>
      </div>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
    </label>
  )
})
Switch.displayName = 'Switch'

export { Switch }
