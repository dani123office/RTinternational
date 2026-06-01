import { useEffect, useRef } from 'react'
import { useManagerStore } from '@/store/managerStore'
import { useToast } from '@/components/ui/toastContext'
import { playNotificationSound } from '@/lib/sound'

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
