import { useEffect, useRef } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useManagerStore } from '@/store/managerStore'
import { useAuthStore } from '@/store/authStore'

export default function Poller({ interval = 60000 }) {
  const loadCallbacks = useDataStore((s) => s.loadCallbacks)
  const loadCustomers = useDataStore((s) => s.loadCustomers)
  const loadTransfers = useDataStore((s) => s.loadTransfers)
  const loadSales = useDataStore((s) => s.loadSales)
  const loadNotifications = useManagerStore((s) => s.loadNotifications)
  const user = useAuthStore((s) => s.user)
  const timerRef = useRef(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function doRefresh() {
      if (!mounted) return
      // skip if no token — avoids 401 → redirect loop
      if (!localStorage.getItem('token') && !sessionStorage.getItem('token')) return
      try {
        // refresh critical lists used across the UI with cache-busting timestamp
        const _t = Date.now()
        await Promise.all([loadCallbacks({ _t }), loadTransfers({ _t }), loadSales({ _t }), loadCustomers({ _t })])
        // only managers can access notifications
        if (user?.role === 'manager' || user?.role === 'admin') {
          await loadNotifications({ _t })
        }
      } catch (e) {
        // ignore errors — individual loaders set their own error state
      }
    }

    function start() {
      if (timerRef.current) return
      cancelledRef.current = false

      const run = async () => {
        timerRef.current = 'running'
        try {
          await doRefresh()
        } finally {
          if (!mounted || cancelledRef.current) {
            timerRef.current = null
            return
          }
          timerRef.current = setTimeout(run, interval)
        }
      }

      run()
    }

    function stop() {
      cancelledRef.current = true
      if (timerRef.current && typeof timerRef.current === 'number') {
        clearTimeout(timerRef.current)
      }
      timerRef.current = null
    }

    start()

    return () => {
      mounted = false
      stop()
    }
  }, [interval, loadCallbacks, loadTransfers, loadSales, loadCustomers, loadNotifications, user])

  return null
}
