import { useEffect, useState } from 'react'
import { useManagerStore } from '@/store/managerStore'
import { Bell, PhoneCall, ArrowLeftRight, PoundSterling } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/manager/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/manager/StatusBadge'

const typeConfig = {
  callback: { icon: PhoneCall, bg: '#eef2ff', color: '#6366f1' },
  transfer: { icon: ArrowLeftRight, bg: '#f0fdf4', color: '#22c55e' },
  sale: { icon: PoundSterling, bg: '#fffbeb', color: '#f59e0b' },
}

export default function ManagerNotifications() {
  const { notifications, loadNotifications, loadAgents, isLoading } = useManagerStore()
  const [filter, setFilter] = useState('')

  useEffect(() => { loadNotifications(); loadAgents() }, [loadNotifications, loadAgents])

  const filtered = filter ? notifications.filter(n => n.type === filter) : notifications

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <PageHeader icon={Bell} iconBg="#f0f9ff" iconColor="#3b82f6" title="Notifications"
            subtitle={`${filtered.length} recent event${filtered.length !== 1 ? 's' : ''} from your team`} />

          <div className="flex gap-2 mb-5 flex-wrap">
            {['', 'callback', 'transfer', 'sale'].map(type => (
              <button key={type} onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  filter === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                {type ? type.charAt(0).toUpperCase() + type.slice(1) + 's' : 'All'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <LoadingSpinner size={28} text="Loading notifications..." />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="Your team hasn't created any records yet" />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((n, i) => {
                const cfg = typeConfig[n.type] || { icon: Bell, bg: '#f1f5f9', color: '#64748b' }
                const Icon = cfg.icon
                return (
                  <div key={i} className="rt-card flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <Icon size={18} color={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-semibold">{n.agentName}</span>
                        {' '}{n.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {n.timestamp ? new Date(n.timestamp).toLocaleString('en-GB') : ''}
                      </p>
                    </div>
                    <StatusBadge status={n.action} type={n.type} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
