import { useState, useEffect } from 'react'
import { WifiOff, X } from 'lucide-react'

export default function ConnectionBanner() {
  const [offline, setOffline] = useState(false)
  const [message, setMessage] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      setOffline(true)
      setDismissed(false)
      setMessage(e.detail || 'Connection lost. Please check your internet connection.')
      setTimeout(() => setOffline(false), 6000)
    }
    window.addEventListener('api:connection-error', handler)
    return () => window.removeEventListener('api:connection-error', handler)
  }, [])

  if (!offline || dismissed) return null

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 sm:px-7 py-2.5 animate-[slideDown_0.3s_ease-out]"
      style={{
        background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
        borderBottom: '1px solid #fecaca',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-rose-100">
          <WifiOff size={14} color="#dc2626" />
        </div>
        <p className="text-sm text-rose-800 font-medium truncate">{message}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border-none bg-transparent text-rose-400 cursor-pointer transition-all duration-150 hover:bg-rose-200 hover:text-rose-600"
      >
        <X size={13} />
      </button>
    </div>
  )
}
