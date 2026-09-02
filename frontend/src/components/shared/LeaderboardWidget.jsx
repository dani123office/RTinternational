import { useState, useEffect } from 'react'
import api, { endpoints } from '@/lib/api'
import { Trophy, Flame, Target, Award, ArrowRight, User } from 'lucide-react'

export default function LeaderboardWidget() {
  const [period, setPeriod] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const res = await api.get(endpoints.manager.leaderboard(period))
        if (isMounted) {
          setData(res.data)
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchLeaderboard()
    return () => {
      isMounted = false
    }
  }, [period])

  const leaderboard = data?.leaderboard || []
  const topPerformer = data?.topPerformer

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/60 shadow-sm mb-8 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600 shadow-sm">
            <Trophy size={18} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Performance Leaderboard
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                <Flame size={12} className="text-rose-500 animate-pulse" /> Live
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Daily targets & top performers across the team
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl text-xs font-semibold self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === 'today'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === 'week'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === 'month'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex items-center justify-center text-xs text-slate-400 gap-2">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Loading leaderboard rankings...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 font-medium">
          No agent activity recorded for this period yet.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top Performer Spotlight (if exists) */}
          {topPerformer && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 border border-amber-300/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center font-black text-sm shadow-md">
                  👑
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md">
                    Top Performer
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {topPerformer.agentName}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {topPerformer.sales} Sales • {topPerformer.transfers} Transfers ({topPerformer.totalDeals} Total Deals)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-amber-700">
                  {topPerformer.progressPct}%
                </span>
                <p className="text-[10px] font-semibold text-slate-500">Target Achieved</p>
              </div>
            </div>
          )}

          {/* List of Agents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {leaderboard.slice(0, 6).map((agent) => (
              <div
                key={agent.agentId}
                className="p-3 rounded-xl border border-slate-200/70 bg-white/50 hover:bg-white transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        agent.rank === 1
                          ? 'bg-amber-100 text-amber-700'
                          : agent.rank === 2
                          ? 'bg-slate-200 text-slate-700'
                          : agent.rank === 3
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {agent.rank}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {agent.agentName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {agent.sales} Sales • {agent.transfers} Transfers
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-800">
                      {agent.totalDeals} / {agent.target}
                    </span>
                    <p className="text-[9px] font-semibold text-slate-400">Deals</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      agent.progressPct >= 100
                        ? 'bg-emerald-500'
                        : agent.progressPct >= 50
                        ? 'bg-indigo-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, agent.progressPct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
