import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall, Clock, ArrowRight } from 'lucide-react'
import api, { endpoints, extractData } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'

const DOT_COLORS = {
  overdue: { dot: '#ef4444', ring: 'rgba(239,68,68,0.15)' },
  today: { dot: '#f59e0b', ring: 'rgba(245,158,11,0.15)' },
  upcoming: { dot: '#6366f1', ring: 'rgba(99,102,241,0.15)' },
}

export default function AdminCallbacks() {
  const navigate = useNavigate()
  const [callbacks, setCallbacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(endpoints.admin.callbacks)
      .then(res => { setCallbacks(extractData(res)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const today = useMemo(() => new Date(), [])
  const todayStr = today.toDateString()

  const grouped = useMemo(() => {
    const active = callbacks.filter((cb) => cb.status !== 'done' && cb.status !== 'not_interested')
    const buckets = { overdue: [], today: [], upcoming: [] }
    active.forEach((cb) => {
      const d = new Date(cb.scheduledDateTime || cb.scheduledDate)
      if (d.toDateString() === todayStr) buckets.today.push(cb)
      else if (d < today) buckets.overdue.push(cb)
      else buckets.upcoming.push(cb)
    })
    const sort = (arr) => arr.sort((a, b) => new Date(a.scheduledDateTime || a.scheduledDate) - new Date(b.scheduledDateTime || b.scheduledDate))
    return { overdue: sort(buckets.overdue), today: sort(buckets.today), upcoming: sort(buckets.upcoming) }
  }, [callbacks, today, todayStr])

  if (loading) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>All Callbacks</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>View callbacks across all agents</p>
          </div>

          {!grouped.overdue.length && !grouped.today.length && !grouped.upcoming.length ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <PhoneCall size={20} color="#6366f1" opacity={0.5} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No callbacks found</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No active callbacks across all agents.</p>
            </div>
          ) : (
            <div className="rt-section-gap">
              {[['Overdue', grouped.overdue], ['Today', grouped.today], ['Upcoming', grouped.upcoming]].map(([title, list]) =>
                list.length > 0 && (
                  <div key={title}>
                    <div className="flex items-center gap-2.5 px-0 py-2">
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                        {title}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b' }}>
                        {list.length}
                      </span>
                    </div>
                    <div className="rt-section-gap">
                      {list.map((cb) => {
                        const d = new Date(cb.scheduledDateTime || cb.scheduledDate)
                        const isOverdue = d < today
                        const isUrgent = !isOverdue && d.toDateString() === todayStr
                        const dotKey = isOverdue ? 'overdue' : isUrgent ? 'today' : 'upcoming'
                        const dot = DOT_COLORS[dotKey]
                        return (
                          <div
                            key={cb.id}
                            onClick={() => navigate(`/admin/callbacks/${cb.id}`)}
                            className="rt-card-flat"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: dot.ring }}>
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot.dot }} />
                              </div>
                              <div className="min-w-0">
                                <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '14px', margin: 0, textTransform: 'capitalize' }}>
                                  {cb.customer?.businessName || cb.customer?.ownerName || 'Unknown'}
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0', textTransform: 'capitalize' }}>
                                  {cb.customer?.ownerName ? `Owner: ${cb.customer.ownerName}` : cb.notes?.slice(0, 60) || ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', fontSize: '12px' }}>
                                <Clock size={12} />
                                {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {d.toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true })}
                              </div>
                              <StatusBadge status={isOverdue ? 'overdue' : cb.status} type="callback" />
                              <ArrowRight size={14} style={{ color: '#d1d5db' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
