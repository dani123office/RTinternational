import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ConnectionBanner from './ConnectionBanner'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toastContext'

export default function AppLayout() {
  const loadAll = useDataStore((s) => s.loadAll)
  const isLoading = useDataStore((s) => s.isLoading)
  const error = useDataStore((s) => s.error)
  const user = useAuthStore((s) => s.user)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (user?.role === 'agent') loadAll()
  }, [loadAll, user])
  
  useEffect(() => { localStorage.setItem('sidebarCollapsed', sidebarCollapsed) }, [sidebarCollapsed])

  useEffect(() => {
    if (error) {
      toast(typeof error === 'string' ? error : 'An error occurred', 'error')
    }
  }, [error, toast])

  useEffect(() => {
    const handler = (e) => {
      toast(e.detail || 'Connection lost. Please check your internet connection.', 'error')
    }
    window.addEventListener('api:connection-error', handler)
    return () => window.removeEventListener('api:connection-error', handler)
  }, [toast])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex flex-col min-w-0 flex-1 transition-all duration-200">
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-auto pb-36">
          {isLoading && (
            <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-100">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rt-loading-bar" style={{ width: '30%' }} />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
