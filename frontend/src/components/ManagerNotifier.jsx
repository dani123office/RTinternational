import { useEffect, useRef } from 'react'
import { useManagerStore } from '@/store/managerStore'
import { useToast } from '@/components/ui/toastContext'

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = 660
    g.gain.value = 0.05
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => {
      o.frequency.value = 880
    }, 150)
    setTimeout(() => {
      o.stop()
      ctx.close()
    }, 600)
  } catch (e) {
    // ignore
  }
}

export default function ManagerNotifier() {
  const notifications = useManagerStore((s) => s.notifications)
  const playedRef = useRef(new Set())
  const { toast } = useToast()

  useEffect(() => {
    notifications.forEach((n) => {
      if (!n || playedRef.current.has(n.id)) return
      playedRef.current.add(n.id)
      playNotificationSound()
      toast(n.message || 'New notification', 'info')
    })
  }, [notifications, toast])

  return null
}
