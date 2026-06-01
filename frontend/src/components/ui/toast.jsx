import { useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { ToastContext } from './toastContext'

const icons = {
  success: { icon: CheckCircle, bg: '#ecfdf5', color: '#16a34a', border: '#bbf7d0' },
  error: { icon: AlertCircle, bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  warning: { icon: AlertTriangle, bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  info: { icon: Info, bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
}

export function Toaster({ children }) {
  const [toasts, setToasts] = useState([])

  function playToastSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = 880
      g.gain.value = 0.04
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      setTimeout(() => {
        o.stop()
        ctx.close()
      }, 350)
    } catch (e) {
      // ignore
    }
  }

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    playToastSound()
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message, type) => addToast(message, type), [addToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const iconDef = icons[t.type] || icons.info
          const IconComp = iconDef.icon
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl p-4 bg-white shadow-lg border animate-[slideIn_0.3s_ease-out]"
              style={{ borderColor: iconDef.border }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: iconDef.bg }}
              >
                <IconComp size={18} color={iconDef.color} />
              </div>
              <p className="text-sm text-slate-800 flex-1 leading-relaxed mt-0.5">
                {t.message}
              </p>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border-none bg-transparent text-slate-400 cursor-pointer transition-all duration-150 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
