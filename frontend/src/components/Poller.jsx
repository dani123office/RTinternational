import { useEffect, useRef } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useManagerStore } from '@/store/managerStore'
import { useAuthStore } from '@/store/authStore'

export default function Poller({ interval = 15000 }) {
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

    // only poll when tab is visible
    function start() {
      if (timerRef.current) return
      cancelledRef.current = false

      const run = async () => {
        // mark as running to prevent concurrent schedulers
        timerRef.current = 'running'
        try {
          await doRefresh()
        } finally {
          // if stop requested or tab hidden or unmounted, don't schedule next
          if (!mounted || cancelledRef.current || document.visibilityState !== 'visible') {
            timerRef.current = null
            return
          }
          // schedule next run
          timerRef.current = setTimeout(run, interval)
        }
      }

      // start first run immediately
      run()
    }

    function stop() {
      cancelledRef.current = true
      if (timerRef.current && typeof timerRef.current === 'number') {
        clearTimeout(timerRef.current)
      }
      timerRef.current = null
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        start()
      } else {
        stop()
      }
    }

    // start polling only if visible now
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [interval, loadCallbacks, loadTransfers, loadSales, loadCustomers, loadNotifications, user])

  return null
}
