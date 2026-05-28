import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatusBadge from '@/components/shared/StatusBadge'
import { extractName, formatDateFull, getGreeting } from '@/lib/format'
import { ArrowRight, RefreshCw, PhoneCall, ArrowLeftRight, PoundSterling } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 shadow-xl border" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
      <p className="text-xs font-semibold mb-1.5" style={{ color: '#64748b' }}>{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: payload[0].color || '#6366f1' }} />
        <p className="font-bold" style={{ color: '#0f172a', fontSize: '15px' }}>{payload[0].value}</p>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, bg, icon, trend }) {
  const gradientBg = bg === '#ede9fe' ? 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)'
    : bg === '#fee2e2' ? 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)'
    : bg === '#f3e8ff' ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
    : bg === '#dcfce7' ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
    : bg === '#fef9c3' ? 'linear-gradient(135deg, #fefce8 0%, #fffbeb 100%)'
    : bg

  return (
    <div className="rt-card-flat cursor-default group">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
          style={{ background: gradientBg }}>
          <div className="relative z-10">{icon}</div>
        </div>
        {trend != null && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
            style={trend >= 0 ? { border: '1px solid #d1fae5' } : { border: '1px solid #fecaca' }}>
            {trend >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-extrabold tracking-tight leading-none" style={{ color: '#0f172a' }}>{value}</p>
        <p className="text-sm font-semibold mt-1" style={{ color: '#475569' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#94a3b8' }}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { callbacks, transfers, sales, error } = useDataStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const today = useMemo(() => new Date(), [])
  const todayStr = today.toDateString()
  const rawFirstName = user?.name?.split(' ')[0] || 'Agent'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)

  const todayCallbacks = useMemo(() =>
    callbacks.filter((c) => {
      const d = new Date(c.scheduledDateTime || c.scheduledDate)
      return d.toDateString() === todayStr && c.status !== 'done' && c.status !== 'not_interested'
    }).sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime)),
    [callbacks, todayStr]
  )

  const overdueCallbacks = useMemo(() =>
    callbacks.filter((c) => c.status !== 'done' && c.status !== 'not_interested' && new Date(c.scheduledDateTime || c.scheduledDate) < today),
    [callbacks, today]
  )

  const weeklySales = useMemo(() => {
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sales.filter((s) => new Date(s.createdAt || s.submittedAt) >= weekAgo)
  }, [sales, today])

  const cotPending = useMemo(() =>
    sales.filter((s) => s.cotStatus === 'chasing' || s.cotStatus === 'cotInProgress'),
    [sales]
  )

  const conversionRate = useMemo(() => {
    if (transfers.length === 0) return 0
    return Math.round((sales.length / transfers.length) * 100)
  }, [transfers, sales])

  const pipelineData = useMemo(() => [
    { name: 'Callbacks', value: callbacks.length, color: '#6366f1' },
    { name: 'Transfers', value: transfers.length, color: '#8b5cf6' },
    { name: 'Sales', value: sales.length, color: '#10b981' },
  ], [callbacks, transfers, sales])

  const weeklyData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const ds = d.toDateString()
      days.push({
        name: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        Callbacks: callbacks.filter((c) => new Date(c.createdAt || c.scheduledDateTime).toDateString() === ds).length,
        Sales: sales.filter((s) => new Date(s.createdAt || today).toDateString() === ds).length,
      })
    }
    return days
  }, [callbacks, sales, today])

  const recentActivity = useMemo(() => {
    const items = [
      ...callbacks.map((c) => ({ ...c, _type: 'callback', _date: new Date(c.createdAt || c.scheduledDateTime) })),
      ...transfers.map((t) => ({ ...t, _type: 'transfer', _date: new Date(t.createdAt || today) })),
      ...sales.map((s) => ({ ...s, _type: 'sale', _date: new Date(s.createdAt || today) })),
    ]
    return items.sort((a, b) => b._date - a._date).slice(0, 8)
  }, [callbacks, transfers, sales, today])

  const typeConfig = {
    callback: { color: '#6366f1', bg: '#eef2ff', label: 'Callback' },
    transfer: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Transfer' },
    sale: { color: '#10b981', bg: '#ecfdf5', label: 'Sale' },
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        {/* ── Header ── */}
        <div className="rt-fade" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
                {getGreeting()}, {firstName}
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0', fontFamily:"'DM Sans', sans-serif", fontWeight: 500 }}>
                {formatDateFull(today)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start flex-wrap">
              <button onClick={() => navigate('/callbacks/add')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                }}>
                <PhoneCall size={14} /> Add Callback
              </button>
              <button onClick={() => navigate('/transfers/add')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                }}>
                <ArrowLeftRight size={14} /> Add Transfer
              </button>
              <button onClick={() => navigate('/sales/apply')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1.5px solid #e2e6ec',
                }}>
                <PoundSterling size={14} /> New Sale
              </button>
              <button onClick={() => useDataStore.getState().loadAll()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1.5px solid #e2e6ec',
                }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Overdue Banner ── */}
        {overdueCallbacks.length > 0 && (
          <div onClick={() => navigate('/callbacks')}
            className="rt-fade rt-d1 flex items-center gap-3 p-3.5 rounded-xl mb-6 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #fef2f2, #fff5f5)',
              border: '1px solid #fecaca',
              boxShadow: '0 1px 3px rgba(239,68,68,0.08)',
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fee2e2' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: '#7f1d1d' }}>{overdueCallbacks.length} overdue callback{overdueCallbacks.length > 1 ? 's' : ''} need attention</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: '#b91c1c' }}>Click to view and reschedule</p>
            </div>
            <ArrowRight size={16} style={{ color: '#ef4444' }} className="shrink-0" />
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="rt-fade rt-d2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mb-7">
          <StatCard title="Today's Callbacks" value={error ? '-' : todayCallbacks.length} subtitle={error ? 'Data unavailable' : overdueCallbacks.length > 0 ? `${overdueCallbacks.length} overdue` : todayCallbacks.length > 0 ? '' : 'None scheduled'} bg="#ede9fe"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>} />
          <StatCard title="Overdue" value={error ? '-' : overdueCallbacks.length} subtitle={error ? 'Data unavailable' : overdueCallbacks.length === 0 ? 'None overdue' : 'Action needed'} bg={overdueCallbacks.length > 0 ? "#fee2e2" : "#dcfce7"}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={overdueCallbacks.length > 0 ? "#ef4444" : "#10b981"} strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>} />
          <StatCard title="Total Transfers" value={error ? '-' : transfers.length} subtitle={error ? 'Data unavailable' : transfers.length === 0 ? 'None yet' : 'In pipeline'} bg="#f3e8ff"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2"><path d="M7 16V4m0 0L3 8m4-4 4 4" /><path d="M17 8v12m0 0 4-4m-4 4-4-4" /></svg>} />
          <StatCard title="Sales This Week" value={error ? '-' : weeklySales.length} subtitle={error ? 'Data unavailable' : 'Last 7 days'} bg="#dcfce7"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} />
          <StatCard title="COT Pending" value={error ? '-' : cotPending.length} subtitle={error ? 'Data unavailable' : 'Awaiting completion'} bg="#fef9c3"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} />
        </div>

        {/* ── Charts Section ── */}
        <div className="rt-fade rt-d3 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 mb-7">
          <div className="rt-card">
            <div className="rt-card-header">
              <h2 className="rt-card-title">Weekly Activity</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#f1f5f9', color: '#64748b' }}>Last 7 days</span>
            </div>
            <div className="rt-card-body">
              <ResponsiveContainer width="100%" height={200} minWidth={1}>
                <BarChart data={weeklyData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                  <Bar dataKey="Callbacks" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Sales" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 justify-center mt-3">
                {[['#6366f1', 'Callbacks'], ['#10b981', 'Sales']].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ background: c }} />
                    <span className="text-xs font-semibold" style={{ color: '#475569' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rt-card">
            <div className="rt-card-header">
              <h2 className="rt-card-title">Pipeline Overview</h2>
            </div>
            <div className="rt-card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ height: '300px' }} className="w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {pipelineData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {pipelineData.every((d) => d.value === 0) ? (
                <p className="text-sm text-center py-4 font-medium" style={{ color: '#94a3b8' }}>No pipeline data yet</p>
              ) : (
                <div className="w-full flex flex-col gap-2 mt-2">
                  {pipelineData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded shrink-0" style={{ background: d.color }} />
                        <span className="text-sm font-semibold" style={{ color: '#475569' }}>{d.name}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{d.value}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-4 text-center" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <span className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>{conversionRate}%</span>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#94a3b8' }}>Conversion Rate</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Section ── */}
        <div className="rt-fade rt-d4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rt-card">
            <div className="rt-card-header">
              <h2 className="rt-card-title">Today's Callbacks</h2>
              <button onClick={() => navigate('/callbacks')}
                className="text-sm font-semibold border-none cursor-pointer px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{ color: '#6366f1', background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#eef2ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                View all &rarr;
              </button>
            </div>
            <div className="rt-card-body">
              {todayCallbacks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#ecfdf5' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p className="font-bold" style={{ color: '#334155' }}>All clear!</p>
                  <p className="text-sm font-medium mt-1" style={{ color: '#94a3b8' }}>No callbacks scheduled for today</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayCallbacks.slice(0, 5).map((cb) => {
                    const d = new Date(cb.scheduledDateTime || cb.scheduledDate)
                    const isOverdue = d < today
                    return (
                      <div key={cb.id} onClick={() => navigate(`/callbacks/${cb.id}`)}
                        className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200"
                        style={{
                          background: isOverdue ? '#fef2f2' : '#f8fafc',
                          border: isOverdue ? '1px solid #fecaca' : '1px solid #f1f5f9',
                        }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isOverdue ? '#ef4444' : '#6366f1' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{extractName(cb.customer)}</p>
                            <p className="text-xs font-medium truncate" style={{ color: '#94a3b8' }}>{cb.customer?.ownerName}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold" style={{ color: isOverdue ? '#ef4444' : '#334155' }}>
                            {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {isOverdue && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ background: '#fee2e2', color: '#dc2626' }}>OVERDUE</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rt-card">
            <div className="rt-card-header">
              <h2 className="rt-card-title">Recent Activity</h2>
              <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>Latest records</span>
            </div>
            <div className="rt-card-body">
              {recentActivity.length === 0 ? (
                <p className="text-sm font-medium text-center py-8" style={{ color: '#94a3b8' }}>No recent activity</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentActivity.map((item, idx) => {
                    const cfg = typeConfig[item._type]
                    return (
                      <div key={`${item._type}-${item.id}-${idx}`}
                        onClick={() => navigate(`/${item._type === 'callback' ? 'callbacks' : item._type === 'transfer' ? 'transfers' : 'sales'}/${item.id}`)}
                        className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
                        style={{ border: '1px solid transparent' }}>
                        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: cfg.bg }}>
                          {item._type === 'callback'
                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                            : item._type === 'transfer'
                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5"><path d="M7 16V4m0 0L3 8m4-4 4 4" /><path d="M17 8v12m0 0 4-4m-4 4-4-4" /></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: '#0f172a' }}>{extractName(item.customer) || item.ownerFullName || 'Unknown'}</p>
                          <p className="text-xs font-medium">
                            <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                            <span style={{ color: '#94a3b8' }}> {' \u00B7 '}{item._date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </p>
                        </div>
                        <StatusBadge status={item.cotStatus || item.status} type={item._type} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
