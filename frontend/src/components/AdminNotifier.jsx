import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toastContext'
import { playNotificationSound } from '@/lib/sound'
import api, { endpoints } from '@/lib/api'

export default function AdminNotifier() {
  const user = useAuthStore((s) => s.user)
  const lastCountsRef = useRef({ users: 0, leaves: 0, loans: 0 })
  const isInitialRef = useRef(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!user || user.role !== 'admin') return

    let mounted = true

    async function check() {
      try {
        const [usersRes, leavesRes, loansRes] = await Promise.all([
          api.get(endpoints.admin.pendingUsers).catch(() => ({ data: [] })),
          api.get(endpoints.leaves.pending).catch(() => ({ data: [] })),
          api.get(endpoints.loans.pending).catch(() => ({ data: [] })),
        ])

        if (!mounted) return

        const users = Array.isArray(usersRes.data) ? usersRes.data.length : 0
        const leaves = Array.isArray(leavesRes.data) ? leavesRes.data.length : 0
        const loans = Array.isArray(loansRes.data) ? loansRes.data.length : 0

        if (isInitialRef.current) {
          lastCountsRef.current = { users, leaves, loans }
          isInitialRef.current = false
          return
        }

        const prev = lastCountsRef.current
        const changes = []

        if (users > prev.users) changes.push(`${users - prev.users} new user${users - prev.users > 1 ? 's' : ''} pending approval`)
        if (leaves > prev.leaves) changes.push(`${leaves - prev.leaves} new leave request${leaves - prev.leaves > 1 ? 's' : ''}`)
        if (loans > prev.loans) changes.push(`${loans - prev.loans} new loan request${loans - prev.loans > 1 ? 's' : ''}`)

        lastCountsRef.current = { users, leaves, loans }

        if (changes.length > 0) {
          playNotificationSound()
          toast(changes.join(', '), 'info')
        }
      } catch {
        // silent
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [user, toast])

  return null
}
