import { useMemo, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import { useAuthStore } from '@/store/authStore'
import {
  BarChart3, Users, UserCog, PhoneCall, ArrowLeftRight,
  PoundSterling, TrendingUp, Activity, Shield, Search, X, Clock, BarChart2, RefreshCw
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { APP_STYLES } from '@/lib/styles'
import StatCard from '@/components/admin/StatCard'

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

export default function AdminDashboard() {
  const { overallStats, performanceOverview, businessFeed, loadOverallStats, loadPerformanceOverview, loadBusinessFeed } = useAdminStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const isAnalytics = location.pathname === '/admin/analytics'
  const isActivity = location.pathname === '/admin/activity'

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }, [])

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadOverallStats(), loadPerformanceOverview(), loadBusinessFeed()])
    setRefreshing(false)
  }

  useEffect(() => {
    loadOverallStats()
    loadPerformanceOverview()
    loadBusinessFeed()
    const interval = setInterval(() => {
      loadOverallStats()
      loadPerformanceOverview()
      loadBusinessFeed()
    }, 60000)
    return () => clearInterval(interval)
  }, [loadOverallStats, loadPerformanceOverview, loadBusinessFeed])

  const stats = overallStats
  const perf = performanceOverview
  const feed = useMemo(() => businessFeed || [], [businessFeed])

  // Activity Feed Filter State
  const [activitySearch, setActivitySearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')

  const filteredFeed = useMemo(() => {
    return feed.filter(item => {
      const matchesSearch = !activitySearch || item.agentName?.toLowerCase().includes(activitySearch.toLowerCase()) || item.description?.toLowerCase().includes(activitySearch.toLowerCase())
      const matchesFilter = activityFilter === 'all' || item.type === activityFilter
      return matchesSearch && matchesFilter
    })
  }, [feed, activitySearch, activityFilter])

  // Analytics Chart Data
  const managerChartData = useMemo(() => {
    if (!perf?.topManagers) return []
    return perf.topManagers.map(m => ({
      name: m.name,
      'Conversion Rate': m.conversionRate,
      'Sales': m.sales,
      'Transfers': m.transfers,
    }))
  }, [perf])

  const pipelinePieData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Callbacks', value: stats.totalCallbacks || 0, color: '#3b82f6' },
      { name: 'Transfers', value: stats.totalTransfers || 0, color: '#10b981' },
      { name: 'Sales', value: stats.totalSales || 0, color: '#f59e0b' },
    ]
  }, [stats])

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        {/* Header */}
        <div className="rt-fade" style={{ marginBottom: '28px' }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Shield size={18} color="white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight capitalize">
              {greeting}, {user?.name?.split(' ')[0] || 'Admin'}
            </h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
            >
              <RefreshCw size={13} className={refreshing ? 'rt-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isAnalytics ? 'Detailed comparative charts and statistics metrics' : isActivity ? 'Complete audit trail of system events and actions' : 'Company-wide analytics and performance overview'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="rt-fade rt-d1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
          <StatCard icon={Users} label="Agents" value={stats?.totalAgents || 0} accent="linear-gradient(135deg, #6366f1, #4f46e5)" onClick={() => navigate('/admin/agents')} />
          <StatCard icon={UserCog} label="Managers" value={stats?.totalManagers || 0} accent="linear-gradient(135deg, #8b5cf6, #7c3aed)" onClick={() => navigate('/admin/managers')} />
          <StatCard icon={PhoneCall} label="Callbacks" value={stats?.totalCallbacks || 0} accent="linear-gradient(135deg, #3b82f6, #2563eb)" onClick={() => navigate('/admin/callbacks')} />
          <StatCard icon={ArrowLeftRight} label="Transfers" value={stats?.totalTransfers || 0} accent="linear-gradient(135deg, #22c55e, #16a34a)" onClick={() => navigate('/admin/transfers')} />
          <StatCard icon={PoundSterling} label="Sales" value={stats?.totalSales || 0} accent="linear-gradient(135deg, #f59e0b, #d97706)" onClick={() => navigate('/admin/sales')} />
          <StatCard icon={TrendingUp} label="Conversion" value={`${stats?.conversionRate || 0}%`} accent="linear-gradient(135deg, #ec4899, #db2777)" progress={stats?.conversionRate || 0} onClick={() => navigate('/admin/analytics')} />
        </div>

        {/* Dynamic Views */}
        {isAnalytics ? (
          /* ────────────────────────────────────────────────────────
             ANALYTICS VIEW
             ──────────────────────────────────────────────────────── */
          <div className="rt-fade rt-d2 flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
              {/* Manager Comparison Bar Chart */}
              <div className="rt-card">
                <div className="rt-card-header">
                  <div className="rt-card-header-left">
                    <div className="rt-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <BarChart2 size={16} color="#8b5cf6" />
                    </div>
                    <span className="rt-card-title">Manager Conversion Comparison</span>
                  </div>
                </div>
                <div className="rt-card-body">
                  {managerChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260} minWidth={1}>
                      <BarChart data={managerChartData} barCategoryGap="40%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.04)' }} />
                        <Bar dataKey="Conversion Rate" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No data available</p>
                  )}
                </div>
              </div>

              {/* Overall Pipeline Pie Chart */}
              <div className="rt-card">
                <div className="rt-card-header">
                  <div className="rt-card-header-left">
                    <div className="rt-card-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>
                      <TrendingUp size={16} color="#22c55e" />
                    </div>
                    <span className="rt-card-title">Pipeline Share Breakdown</span>
                  </div>
                </div>
                <div className="rt-card-body flex flex-col items-center">
                  <div style={{ height: '170px' }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <PieChart>
                        <Pie data={pipelinePieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {pipelinePieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full flex flex-col gap-2 mt-2">
                    {pipelinePieData.map((d) => {
                      const route = d.name === 'Callbacks' ? '/admin/callbacks' : d.name === 'Transfers' ? '/admin/transfers' : '/admin/sales'
                      return (
                        <div key={d.name} onClick={() => navigate(route)} className="flex items-center justify-between py-1 border-b border-slate-50 text-xs cursor-pointer hover:bg-slate-50/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                            <span className="font-semibold text-slate-600">{d.name}</span>
                          </div>
                          <span className="font-bold text-slate-900">{d.value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Managers Table list */}
            <div className="rt-card">
              <div className="rt-card-header">
                <div className="rt-card-header-left">
                  <div className="rt-card-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                    <UserCog size={16} color="#6366f1" />
                  </div>
                  <span className="rt-card-title">Managers Leaderboard</span>
                </div>
              </div>
              <div className="rt-card-body" style={{ padding: 0 }}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">
                        <th className="px-6 py-3">Manager</th>
                        <th className="px-6 py-3">Team Size</th>
                        <th className="px-6 py-3">Callbacks</th>
                        <th className="px-6 py-3">Transfers</th>
                        <th className="px-6 py-3">Sales</th>
                        <th className="px-6 py-3 text-right">Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perf?.topManagers?.map((m) => (
                        <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-slate-900 capitalize">{m.name}</td>
                          <td className="px-6 py-3.5 text-slate-500">{m.teamSize} agents</td>
                          <td className="px-6 py-3.5 text-slate-500">{m.callbacks}</td>
                          <td className="px-6 py-3.5 text-slate-500">{m.transfers}</td>
                          <td className="px-6 py-3.5 text-slate-500">{m.sales}</td>
                          <td className="px-6 py-3.5 text-right font-bold" style={{ color: m.conversionRate > 20 ? '#22c55e' : '#f59e0b' }}>
                            {m.conversionRate}%
                          </td>
                        </tr>
                      ))}
                      {!perf?.topManagers?.length && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">No managers found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : isActivity ? (
          /* ────────────────────────────────────────────────────────
             ACTIVITY FEED VIEW
             ──────────────────────────────────────────────────────── */
          <div className="rt-fade rt-d2 rt-card">
            <div className="rt-card-header flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{ background: 'rgba(236,72,153,0.1)' }}>
                  <Activity size={16} color="#ec4899" />
                </div>
                <span className="rt-card-title">Live Audit Trail</span>
              </div>

              {/* Filters */}
              <div className="flex gap-2.5 items-center flex-wrap flex-1 justify-end">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 w-full max-w-xs">
                  <Search size={14} color="#94a3b8" />
                  <input
                    placeholder="Search by agent..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="border-none outline-none flex-1 text-xs bg-transparent text-slate-800"
                  />
                  {activitySearch && (
                    <button onClick={() => setActivitySearch('')} className="border-0 bg-transparent text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {['all', 'callback', 'transfer', 'sale'].map(type => (
                    <button
                      key={type}
                      onClick={() => setActivityFilter(type)}
                      className={`px-3 py-1 rounded-md text-[0.7rem] font-bold border-none cursor-pointer capitalize transition-all duration-150 ${activityFilter === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'}`}
                    >
                      {type === 'all' ? 'All Events' : type + 's'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rt-card-body">
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredFeed.map((item, i) => (
                  <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-50 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{
                      background: item.type === 'callback' ? '#eef2ff' : item.type === 'transfer' ? '#f0fdf4' : '#fffbeb',
                    }}>
                      {item.type === 'callback' ? <PhoneCall size={14} color="#6366f1" />
                        : item.type === 'transfer' ? <ArrowLeftRight size={14} color="#22c55e" />
                        : <PoundSterling size={14} color="#f59e0b" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        <span className="capitalize">{item.agentName}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Clock size={12} />
                      {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + new Date(item.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </div>
                  </div>
                ))}
                {filteredFeed.length === 0 && (
                  <div className="text-center py-12">
                    <Activity size={32} color="#cbd5e1" className="mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No activities matched</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ────────────────────────────────────────────────────────
             DASHBOARD OVERVIEW VIEW
             ──────────────────────────────────────────────────────── */
          <>
            <div className="rt-fade rt-d2 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-6">
              {/* Top Agents Leaderboard */}
              <div className="rt-card">
                <div className="rt-card-header">
                  <div className="rt-card-header-left">
                    <div className="rt-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <BarChart3 size={16} color="#8b5cf6" />
                    </div>
                    <span className="rt-card-title">Top Agents</span>
                  </div>
                </div>
                <div className="rt-card-body">
                  {perf?.topAgents?.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {perf.topAgents.map((a, i) => (
                        <div key={a.id} onClick={() => navigate(`/admin/agents/${a.id}`)} className={`flex items-center gap-3 p-2.5 rounded-xl ${i === 0 ? 'bg-violet-50' : 'bg-slate-50'} cursor-pointer hover:bg-slate-100`}>
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${i < 3 ? 'text-white' : 'text-slate-500 bg-slate-200'}`}
                            style={{ background: i === 0 ? '#8b5cf6' : i === 1 ? '#6366f1' : i === 2 ? '#3b82f6' : undefined }}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate capitalize">{a.name}</p>
                            <p className="text-xs text-slate-400 truncate capitalize">{a.managerName || 'N/A'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-slate-900">{a.sales} sales</p>
                            <p className="text-xs" style={{ color: a.conversionRate > 30 ? '#22c55e' : '#f59e0b' }}>{a.conversionRate}% conv</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No agents yet</p>
                  )}
                </div>
              </div>

              {/* Live Feed Subset */}
              <div className="rt-card">
                <div className="rt-card-header">
                  <div className="rt-card-header-left">
                    <div className="rt-card-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>
                      <Activity size={16} color="#22c55e" />
                    </div>
                    <span className="rt-card-title">Live Feed</span>
                  </div>
                  <button onClick={() => navigate('/admin/activity')} className="text-xs font-bold text-indigo-600 bg-transparent hover:text-indigo-800 border-none cursor-pointer">View all</button>
                </div>
                    <div className="rt-card-body">
                  <div className="flex flex-col gap-2 max-h-[320px] overflow-auto">
                    {feed.length > 0 ? feed.slice(0, 15).map((item, i) => (
                      <div key={i} onClick={() => { if (item.type === 'callback') navigate(`/admin/callbacks/${item.id}`); else if (item.type === 'transfer') navigate(`/admin/transfers/${item.id}`); else if (item.type === 'sale') navigate(`/admin/sales/${item.id}`) }} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${i % 2 === 0 ? 'bg-slate-50' : ''} cursor-pointer hover:bg-slate-50`}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                          background: item.type === 'callback' ? '#6366f1' : item.type === 'transfer' ? '#22c55e' : '#f59e0b',
                        }} />
                        <span className="font-semibold text-slate-900 truncate capitalize">{item.agentName}</span>
                        <span className="text-slate-500 truncate">{item.description}</span>
                        <span className="text-slate-400 text-xs ml-auto shrink-0 whitespace-nowrap">
                          {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Managers Grid */}
            <div className="rt-card rt-fade rt-d3">
              <div className="rt-card-header">
                <div className="rt-card-header-left">
                  <div className="rt-card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                    <UserCog size={16} color="#8b5cf6" />
                  </div>
                  <span className="rt-card-title">Top Managers</span>
                </div>
              </div>
              <div className="rt-card-body">
                {perf?.topManagers?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {perf.topManagers.slice(0, 6).map((m, i) => (
                      <div key={m.id} onClick={() => navigate(`/admin/managers/${m.id}`)} className={`p-4 rounded-xl ${i === 0 ? 'bg-violet-50 border border-violet-200' : 'bg-slate-50 border border-transparent'} cursor-pointer hover:shadow-sm`}>
                        <div className="flex justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-slate-900 truncate capitalize">{m.name}</p>
                          <span className="text-xs text-slate-500 shrink-0">{m.teamSize} agents</span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>C: {m.callbacks}</span>
                          <span>T: {m.transfers}</span>
                          <span>S: {m.sales}</span>
                          <span className="font-semibold" style={{ color: m.conversionRate > 20 ? '#22c55e' : '#f59e0b' }}>{m.conversionRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No managers yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
