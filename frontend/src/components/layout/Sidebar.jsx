import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, PhoneCall, ArrowLeftRight,
  PoundSterling, Users, ChevronLeft, ChevronRight,
  UsersRound, BarChart3, Bell, Shield,
  UserCog, Activity, Settings, UserPlus,
} from 'lucide-react'

const NAV_ITEMS = {
  admin: [
    { to: '/admin', icon: Shield, label: 'Dashboard' },
    { to: '/admin/managers', icon: UserCog, label: 'Managers' },
    { to: '/admin/pending', icon: UserPlus, label: 'Pending Approvals' },
    { to: '/admin/agents', icon: Users, label: 'Agents' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/activity', icon: Activity, label: 'Activity Feed' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ],
  manager: [
    { to: '/manager', icon: LayoutDashboard, label: 'Team Dashboard' },
    { to: '/manager/agents', icon: UsersRound, label: 'Agents' },
    { to: '/manager/callbacks', icon: PhoneCall, label: 'Callbacks' },
    { to: '/manager/transfers', icon: ArrowLeftRight, label: 'Transfers' },
    { to: '/manager/sales', icon: PoundSterling, label: 'Sales' },
    { to: '/manager/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ],
  agent: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/callbacks', icon: PhoneCall, label: 'Callbacks' },
    { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
    { to: '/sales', icon: PoundSterling, label: 'Sales' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ],
}

const ROLE_LABEL = { admin: 'Admin Console', manager: 'Manager Portal', agent: 'Energy Call Centre' }
const ROLE_FOOTER = { admin: 'Admin Account', manager: 'Manager Account', agent: 'Agent Account' }

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const { user } = useAuthStore()
  const role = user?.role || 'agent'
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.agent
  const [hoveredItem, setHoveredItem] = useState(null)

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/'
    const a = location.pathname.split('/').filter(Boolean)
    const b = to.split('/').filter(Boolean)
    if (b.length === 1) return a.length === 1 && a[0] === b[0]
    return a.length >= b.length && b.every((seg, i) => seg === a[i])
  }

  return (
    <aside
      className="h-full flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out relative z-10"
      style={{
        width: collapsed ? '72px' : '260px',
        background: '#0f172a',
      }}
    >
      {/* Brand Header */}
      <div
        className="flex items-center border-b shrink-0 transition-all duration-300"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          padding: collapsed ? '0.6rem 0.5rem' : '0.6rem 0.75rem',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: '60px',
        }}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-white font-bold truncate" style={{ fontSize: '0.92rem', letterSpacing: '-0.01em' }}>
                RT International
              </h1>
              <p className="truncate" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem' }}>
                {ROLE_LABEL[role]}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onToggle}
            className="shrink-0 w-7 h-7 rounded-lg border-none flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/15"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
            title="Collapse sidebar"
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin" style={{ padding: collapsed ? '0.75rem 0' : '1rem 0.75rem' }}>
        {navItems.map((item) => {
          const active = isActive(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center rounded-xl no-underline transition-all duration-150 whitespace-nowrap overflow-hidden group relative"
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : '0.75rem',
                padding: collapsed ? '0.75rem' : '0.6rem 0.75rem',
                background: active ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
                fontWeight: active ? 600 : 400,
                fontSize: '0.88rem',
                margin: collapsed ? '0 0.5rem' : 0,
              }}
              onMouseEnter={() => setHoveredItem(item.to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <item.icon size={20} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <span className="ml-auto w-2 h-2 rounded-full bg-white/80" />
              )}
              {collapsed && hoveredItem === item.to && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs whitespace-nowrap z-50 shadow-lg border border-slate-700 animate-[fadeIn_0.1s_ease-out]">
                  {item.label}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      {collapsed ? (
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={onToggle}
            className="w-full p-2 rounded-lg border-none flex items-center justify-center cursor-pointer transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
            title="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="p-4 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="truncate" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem' }}>&copy; 2026 RT International</p>
          <p className="truncate" style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.6rem', marginTop: '2px' }}>{ROLE_FOOTER[role]}</p>
          <p className="truncate" style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.6rem', marginTop: '2px' }}>Credit: M Ahsan Shahid</p>
        </div>
      )}
    </aside>
  )
}
