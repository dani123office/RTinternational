import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useManagerStore } from '@/store/managerStore'
import { ArrowLeftRight, PoundSterling, TrendingUp, BarChart3, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { APP_STYLES } from '@/lib/styles'
import StatCard from '@/components/manager/StatCard'
import AgentCard from '@/components/manager/AgentCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import StatusBadge from '@/components/shared/StatusBadge'
import { extractName, formatDateFull } from '@/lib/format'

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

export default function TeamDashboard() {
  const { teamStats, transfers, sales, loadTeamStats, loadTransfers, loadSales, isLoading } = useManagerStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const firstName = user?.name?.split(' ')[0] || 'Team'
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }, [])

  const [timeframe, setTimeframe] = useState('all_time')

  useEffect(() => {
    loadTransfers({ limit: 500 })
    loadSales({ limit: 500 })
  }, [loadTransfers, loadSales])

  useEffect(() => {
    loadTeamStats({ timeframe })
  }, [loadTeamStats, timeframe])

  const agents = teamStats?.agents || []
  const today = useMemo(() => new Date(), [])

  const weeklySales = useMemo(() => {
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sales.filter((s) => new Date(s.createdAt || s.submittedAt) >= weekAgo)
  }, [sales, today])

  const cotPending = useMemo(() =>
    sales.filter((s) => s.cotStatus === 'chasing' || s.cotStatus === 'cotInProgress'),
    [sales]
  )

  const pipelineData = useMemo(() => [
    { name: 'Transfers', value: transfers.length, color: '#8b5cf6' },
    { name: 'Sales', value: sales.length, color: '#10b981' },
  ], [transfers, sales])

  const weeklyData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const ds = d.toDateString()
      days.push({
        name: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        Transfers: transfers.filter((t) => new Date(t.createdAt || today).toDateString() === ds).length,
        Sales: sales.filter((s) => new Date(s.createdAt || today).toDateString() === ds).length,
      })
    }
    return days
  }, [transfers, sales, today])

  const recentActivity = useMemo(() => {
    const items = [
      ...transfers.map((t) => ({ ...t, _type: 'transfer', _date: new Date(t.createdAt || today) })),
      ...sales.map((s) => ({ ...s, _type: 'sale', _date: new Date(s.createdAt || today) })),
    ]
    return items.sort((a, b) => b._date - a._date).slice(0, 8)
  }, [transfers, sales, today])

  const typeConfig = {
    transfer: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Transfer' },
    sale: { color: '#10b981', bg: '#ecfdf5', label: 'Sale' },
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div className="rt-fade" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
                {greeting}, <span className="capitalize">{firstName}</span>
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>
                {formatDateFull(today)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start flex-wrap">
              <button onClick={() => navigate('/manager/transfers')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                }}>
                <ArrowLeftRight size={14} /> View Transfers
              </button>
              <button onClick={() => navigate('/manager/sales')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1.5px solid #e2e6ec',
                }}>
                <PoundSterling size={14} /> View Sales
              </button>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                <option value="all_time">All Time</option>
                <option value="this_week">This Week</option>
                <option value="today">Today</option>
              </select>
              <button onClick={() => { loadTeamStats({ timeframe }); loadTransfers({ limit: 500 }); loadSales({ limit: 500 }) }}
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

        {isLoading && !teamStats ? (
          <LoadingSpinner size={32} text="Loading team stats..." />
        ) : (
          <>
            {/* Stat Cards */}
            <div className="rt-fade rt-d2 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard icon={ArrowLeftRight} label="Total Transfers" value={teamStats?.totalTransfers || 0} accent="linear-gradient(135deg, #22c55e, #16a34a)" />
              <StatCard icon={PoundSterling} label="Total Sales" value={teamStats?.totalSales || 0} accent="linear-gradient(135deg, #f59e0b, #d97706)" />
              <StatCard icon={TrendingUp} label="Conversion Rate" value={`${teamStats?.conversionRate || 0}%`} accent="linear-gradient(135deg, #8b5cf6, #7c3aed)" subtext={`${teamStats?.totalTransfers || 0} total opportunities`} />
            </div>

            {/* Secondary Stats */}
            {sales.length > 0 ? (
              <div className="rt-fade rt-d3 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales This Week</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{weeklySales.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Last 7 days</p>
                </div>
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">COT Pending</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{cotPending.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Awaiting completion</p>
                </div>
              </div>
            ) : null}

            {/* Charts Section */}
            <div className="rt-fade rt-d4 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 mb-7" style={{ minHeight: 0 }}>
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
                        <Bar dataKey="Transfers" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="Sales" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  <div className="flex gap-6 justify-center mt-3">
                    {[['#8b5cf6', 'Transfers'], ['#10b981', 'Sales']].map(([c, l]) => (
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
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Agent Leaderboard */}
            <div className="rt-card rt-fade rt-d5">
              <div className="rt-card-header">
                <div className="rt-card-header-left">
                  <div className="rt-card-icon" style={{background: 'rgba(99,102,241,0.15)'}}>
                    <BarChart3 size={16} color="#6366f1" />
                  </div>
                  <span className="rt-card-title">Agent Leaderboard</span>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded">by conversion rate</span>
              </div>
              <div className="rt-card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map((item, index) => (
                    <AgentCard key={item.agent.id} agent={item.agent} stats={item} rank={index} />
                  ))}
                  {agents.length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <p className="text-sm text-slate-400 font-medium">No agents found in your team</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rt-fade rt-d6 grid grid-cols-1 gap-5 mt-6">
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
                            onClick={() => {
                              const path = item._type === 'transfer' ? `/manager/transfers/${item.id}` : `/sales/${item.id}`
                              navigate(path)
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
                            style={{ border: '1px solid transparent' }}>
                            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: cfg.bg }}>
                              {item._type === 'transfer'
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
                            <StatusBadge status={item.cotStatus || item.status} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
