import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const variants = {
  default:
    'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm hover:from-indigo-700 hover:to-blue-700 active:scale-[0.97] focus-visible:ring-indigo-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400',
  destructive:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-[0.97] focus-visible:ring-rose-500 disabled:bg-slate-100 disabled:text-slate-400',
  outline:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus-visible:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200',
  secondary:
    'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400 disabled:text-slate-300',
  link:
    'bg-transparent text-indigo-600 hover:text-indigo-700 underline underline-offset-4 focus-visible:ring-indigo-500 disabled:text-slate-300',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97] focus-visible:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400',
}

const sizes = {
  default: 'h-10 px-5 text-sm',
  sm: 'h-9 px-3.5 text-xs rounded-lg',
  lg: 'h-11 px-7 text-base rounded-xl',
  icon: 'h-10 w-10 p-0 shrink-0',
}

const Button = forwardRef(({
  className = '',
  variant = 'default',
  size = 'default',
  asChild = false,
  disabled,
  loading,
  title,
  ...props
}, ref) => {
  const Comp = asChild ? 'span' : 'button'

  const cls = cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none select-none',
    variants[variant] || variants.default,
    sizes[size] || sizes.default,
    loading && 'relative !text-transparent',
    className,
  )

  return (
    <Comp
      ref={ref}
      className={cls}
      disabled={asChild ? undefined : disabled || loading}
      role={asChild ? 'button' : undefined}
      tabIndex={disabled || loading ? -1 : 0}
      title={title}
      {...props}
    >
      {loading && (
        <Loader2 size={16} className="absolute animate-spin text-current" />
      )}
      {props.children}
    </Comp>
  )
})

Button.displayName = 'Button'

export { Button }
