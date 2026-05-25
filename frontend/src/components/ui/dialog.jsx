import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Dialog({
  open,
  onOpenChange,
  children,
  closeOnOverlayClick = true,
}) {
  const handleClose = useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleClose],
  )

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'

    // Prevent layout shift when scrollbar disappears
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => {
          if (closeOnOverlayClick) {
            handleClose()
          }
        }}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-50 w-full max-w-lg',
          'rounded-3xl border border-white/20',
          'bg-white/95 backdrop-blur-xl',
          'shadow-[0_20px_80px_rgba(0,0,0,0.18)]',
          'animate-in fade-in zoom-in-95 duration-200',
          'max-h-[90vh] overflow-y-auto',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function DialogContent({ children, className }) {
  return (
    <div
      className={cn(
        'px-10 pb-8 pt-10 mx-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ children, className }) {
  return (
    <div
      className={cn(
        'mb-8 space-y-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DialogTitle({ children, className }) {
  return (
    <h2
      className={cn(
        'text-2xl font-bold tracking-tight text-slate-900',
        className,
      )}
    >
      {children}
    </h2>
  )
}

export function DialogDescription({ children, className }) {
  return (
    <p
      className={cn(
        'mt-1 text-sm leading-relaxed text-slate-500',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function DialogFooter({ children, className }) {
  return (
    <div
      className={cn(
        'mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DialogClose({ onClose, className }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={cn(
        'absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full',
        'bg-slate-100/80 text-slate-500 backdrop-blur z-10',
        'transition-all duration-200',
        'hover:scale-105 hover:bg-slate-200 hover:text-slate-700',
        'focus:outline-none focus:ring-2 focus:ring-slate-400',
        className,
      )}
      aria-label="Close dialog"
    >
      <X size={16} />
    </button>
  )
}
