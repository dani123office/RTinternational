import { useEffect, useRef } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useToast } from '@/components/ui/toastContext'
import { playCallbackSound } from '@/lib/sound'

export default function CallbackNotifier() {
  const callbacks = useDataStore((s) => s.callbacks)
  const playedRef = useRef(new Set())
  const intervalRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    function checkDue() {
      const now = Date.now()
      callbacks.forEach((cb) => {
        if (!cb || !cb.scheduledDateTime) return
        if (playedRef.current.has(cb.id)) return
        const scheduled = new Date(cb.scheduledDateTime).getTime()
        // Trigger when scheduled time is within the past 5s and next 30s window
        if (Math.abs(scheduled - now) <= 30000) {
          playedRef.current.add(cb.id)
          playCallbackSound()
          const label = cb.customer?.businessName || cb.customer?.ownerName || cb.customer?.ownerFullName || `Callback ${cb.id}`
          toast(`Callback due: ${label} — ${new Date(cb.scheduledDateTime).toLocaleTimeString()}`, 'info')
        }
      })
    }

    // initial check
    checkDue()
    intervalRef.current = setInterval(checkDue, 15000)
    return () => clearInterval(intervalRef.current)
  }, [callbacks, toast])

  return null
}
