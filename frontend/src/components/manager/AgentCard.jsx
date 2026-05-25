import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, PoundSterling, TrendingUp, Medal, User } from 'lucide-react'

const badges = {
  gold: { label: 'Top Performer', color: '#f59e0b', bg: '#fffbeb' },
  silver: { label: 'Strong', color: '#64748b', bg: '#f8fafc' },
  bronze: { label: 'Growing', color: '#d97706', bg: '#fff7ed' },
}

export default function AgentCard({ agent, stats, rank }) {
  const navigate = useNavigate()

  const hasResults = (stats?.sales || 0) > 0 || (stats?.conversionRate || 0) > 0
  const badge = !hasResults ? null : rank === 0 ? badges.gold : rank === 1 ? badges.silver : rank <= 3 ? badges.bronze : null

  return (
    <div
      onClick={() => navigate(`/manager/agents/${agent.id}`)}
      className="group bg-white/85 backdrop-blur-md rounded-2xl p-5 cursor-pointer transition-all duration-250 hover:-translate-y-0.5"
      style={{
        border: badge ? `1px solid ${badge.color}40` : '1px solid rgba(226,232,240,0.6)',
        boxShadow: badge ? `0 4px 20px ${badge.color}20` : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shrink-0">
            <User size={18} color="white" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-[0.9rem] capitalize">{agent.name}</h4>
            <p className="text-[0.72rem] text-slate-400">{agent.email}</p>
          </div>
        </div>
        {badge && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-semibold whitespace-nowrap"
            style={{ background: badge.bg, color: badge.color }}
          >
            <Medal size={10} />
            {badge.label}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-1.5 rounded-lg bg-slate-50">
          <ArrowLeftRight size={13} color="#22c55e" className="mx-auto mb-0.5" />
          <p className="text-[0.8rem] font-semibold text-slate-900">{stats?.transfers || 0}</p>
          <p className="text-[0.6rem] text-slate-400">Transfers</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-slate-50">
          <PoundSterling size={13} color="#f59e0b" className="mx-auto mb-0.5" />
          <p className="text-[0.8rem] font-semibold text-slate-900">{stats?.sales || 0}</p>
          <p className="text-[0.6rem] text-slate-400">Sales</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 mr-3">
          <div className="flex justify-between mb-0.5">
            <span className="text-[0.68rem] text-slate-500">Conversion</span>
            <span className="text-[0.68rem] font-semibold text-slate-900">{stats?.conversionRate || 0}%</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(stats?.conversionRate || 0, 100)}%`,
                background: (stats?.conversionRate || 0) > 50
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
              }}
            />
          </div>
        </div>
        <TrendingUp size={16} color={(stats?.conversionRate || 0) > 0 ? "#22c55e" : "#94a3b8"} className="shrink-0" />
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100/85 opacity-60 group-hover:opacity-100 transition-all duration-200">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/manager/agents/${agent.id}`)
          }}
          className="flex-1 py-1.5 rounded-lg text-[0.7rem] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 transition-all duration-150 border-none cursor-pointer text-center"
        >
          View Profile
        </button>
        <a
          href={`mailto:${agent.email}`}
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-1.5 rounded-lg text-[0.7rem] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 transition-all duration-150 border-none cursor-pointer text-center no-underline"
        >
          Message
        </a>
      </div>
    </div>
  )
}
