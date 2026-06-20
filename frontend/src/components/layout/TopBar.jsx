import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toastContext'
import { LogOut, User, ChevronDown, Settings, PhoneCall, ArrowLeftRight, Menu } from 'lucide-react'

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isOnFormPage = ['/add', '/edit', '/apply'].some((p) => location.pathname.includes(p))
  const isListPage = ['/callbacks', '/transfers', '/sales'].some((p) => {
    if (p === '/sales') return location.pathname === '/sales'
    return location.pathname === p || location.pathname === `/manager${p}`
  })
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    toast('Logged out successfully', 'success')
    navigate('/login')
  }

  const isManager = user?.role === 'manager'
  const gradient = isManager ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #6366f1, #3b82f6)'
  const badgeBg = isManager ? '#f5f3ff' : '#eef2ff'
  const badgeColor = isManager ? '#7c3aed' : '#6366f1'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-7 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 cursor-pointer flex items-center justify-center transition-colors hover:bg-slate-50 md:hidden animate-[fadeIn_0.2s_ease-out]"
          title="Open menu"
        >
          <Menu size={16} />
        </button>
        {user?.role === 'agent' && !isOnFormPage && !isListPage && location.pathname !== '/' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/callbacks/add')}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors"
            >
              <PhoneCall size={13} />
              <span className="hidden sm:inline">Add Callback</span>
            </button>
            <button
              onClick={() => navigate('/transfers/add')}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors"
            >
              <ArrowLeftRight size={13} />
              <span className="hidden sm:inline">Add Transfer</span>
            </button>
          </div>
        )}
        {user?.role === 'admin' && location.pathname !== '/admin' && location.pathname.startsWith('/admin') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/callbacks')}
              className="flex items-center gap-2 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors"
            >
              <PhoneCall size={13} />
              <span className="hidden sm:inline">Callbacks</span>
            </button>
            <button
              onClick={() => navigate('/admin/transfers')}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors"
            >
              <ArrowLeftRight size={13} />
              <span className="hidden sm:inline">Transfers</span>
            </button>
            <button
              onClick={() => navigate('/admin/sales')}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors"
            >
              <span className="text-base leading-none">£</span>
              <span className="hidden sm:inline">Sales</span>
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0" ref={menuRef}>
        <div
          className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-all duration-150 select-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: gradient }}>
            <User size={13} color="white" />
          </div>
          <span className="hidden md:inline truncate max-w-[120px] capitalize">{user?.name}</span>
          <span className="text-xs font-semibold uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0"
            style={{ background: badgeBg, color: badgeColor }}>
            {user?.role || 'agent'}
          </span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
        </div>

        {menuOpen && (
          <div className="absolute top-14 right-4 sm:right-7 w-48 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-[fadeIn_0.1s_ease-out]">
            <div className="px-3.5 py-2.5 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900 truncate" style={{textTransform: 'capitalize'}}>{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); navigate('/profile') }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Settings size={15} />
              Profile Settings
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-400 cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 shrink-0"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
