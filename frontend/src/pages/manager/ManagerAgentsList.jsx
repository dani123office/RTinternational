import { useEffect, useState } from 'react'
import { useManagerStore } from '@/store/managerStore'
import { UsersRound, Search } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import AgentCard from '@/components/manager/AgentCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/manager/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/manager/StatCard'
import { BarChart3, PhoneCall, ArrowLeftRight, PoundSterling } from 'lucide-react'

export default function ManagerAgentsList() {
  const { agents, teamStats, loadAgents, loadTeamStats, isLoading } = useManagerStore()
  const [search, setSearch] = useState('')
  const [timeframe, setTimeframe] = useState('all_time')

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useEffect(() => {
    loadTeamStats({ timeframe })
  }, [loadTeamStats, timeframe])

  const filtered = agents.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.email?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = teamStats

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <PageHeader icon={UsersRound} iconBg="#eef2ff" iconColor="#6366f1" title="Team Agents"
            subtitle={`${filtered.length} agent${filtered.length !== 1 ? 's' : ''} in your team`} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard icon={PhoneCall} label="Total Callbacks" value={stats?.totalCallbacks || 0} accent="linear-gradient(135deg, #6366f1, #4f46e5)" />
            <StatCard icon={ArrowLeftRight} label="Total Transfers" value={stats?.totalTransfers || 0} accent="linear-gradient(135deg, #22c55e, #16a34a)" />
            <StatCard icon={PoundSterling} label="Total Sales" value={stats?.totalSales || 0} accent="linear-gradient(135deg, #f59e0b, #d97706)" />
            <StatCard icon={BarChart3} label="Conversion Rate" value={`${stats?.conversionRate || 0}%`} accent="linear-gradient(135deg, #8b5cf6, #7c3aed)" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-slate-200 max-w-xs w-full">
              <Search size={16} color="#94a3b8" />
              <input placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="border-none outline-none flex-1 text-sm bg-transparent" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeframe:</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                <option value="all_time">All Time</option>
                <option value="this_week">This Week</option>
                <option value="today">Today</option>
              </select>
            </div>
          </div>

          {isLoading && filtered.length === 0 ? (
            <LoadingSpinner size={32} text="Loading agents..." />
          ) : filtered.length === 0 ? (
            <EmptyState icon={UsersRound} title="No agents found" description={search ? 'Try a different search' : 'No agents assigned to you yet'} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((agent, index) => {
                const agentStats = stats?.agents?.find(s => s.agent?.id === agent.id)
                return (
                  <AgentCard key={agent.id} agent={agent} stats={agentStats} rank={index} />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
