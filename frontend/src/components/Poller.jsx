import { useEffect, useRef } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useManagerStore } from '@/store/managerStore'

export default function Poller({ interval = 15000 }) {
  const loadCallbacks = useDataStore((s) => s.loadCallbacks)
  const loadCustomers = useDataStore((s) => s.loadCustomers)
  const loadTransfers = useDataStore((s) => s.loadTransfers)
  const loadSales = useDataStore((s) => s.loadSales)
  const loadNotifications = useManagerStore((s) => s.loadNotifications)
  const timerRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function doRefresh() {
      if (!mounted) return
      try {
        // refresh critical lists used across the UI
        await Promise.all([loadCallbacks(), loadTransfers(), loadSales(), loadCustomers()])
        // manager notifications separately
        await loadNotifications()
      } catch (e) {
        // ignore errors — individual loaders set their own error state
      }
    }

    // only poll when tab is visible
    function start() {
      if (timerRef.current) return
      timerRef.current = setInterval(doRefresh, interval)
    }
    function stop() {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        doRefresh()
        start()
      } else {
        stop()
      }
    }

    // initial run
    doRefresh()
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [interval, loadCallbacks, loadTransfers, loadSales, loadCustomers, loadNotifications])

  return null
}
