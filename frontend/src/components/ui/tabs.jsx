import { createContext, useContext, useState, useId } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext(null)

export function Tabs({ defaultValue, value, onValueChange, className, children, ...props }) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const activeValue = value !== undefined ? value : internalValue
  const setValue = onValueChange || setInternalValue

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: setValue }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500 gap-1',
        className,
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children, disabled, ...props }) {
  const ctx = useContext(TabsContext)
  const id = useId()
  const isActive = ctx?.value === value

  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50',
        className,
      )}
      onClick={() => ctx?.onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children, ...props }) {
  const ctx = useContext(TabsContext)
  const id = useId()
  if (ctx?.value !== value) return null

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={cn('mt-3 ring-offset-white focus-visible:outline-none animate-[fadeIn_0.2s_ease-out]', className)}
      {...props}
    >
      {children}
    </div>
  )
}
