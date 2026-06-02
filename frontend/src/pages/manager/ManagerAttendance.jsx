import { useEffect, useState, useCallback } from 'react'
import api, { endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { APP_STYLES } from '@/lib/styles'
import { Users, Clock, CheckCircle, AlertTriangle, XCircle, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ManagerAttendance() {
  const { user } = useAuthStore()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState(null)
  const [agentHistory, setAgentHistory] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [historyPage, setHistoryPage] = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadTeam = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(endpoints.attendance.teamToday)
      setTeam(res.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTeam() }, [loadTeam])

  const loadAgentHistory = useCallback(async (agentId, page = 1) => {
    setHistoryLoading(true)
    try {
      const res = await api.get(endpoints.attendance.agentHistory(agentId), { params: { page, perPage: 10 } })
      setAgentHistory(res.data)
      setSelectedAgentId(agentId)
    } catch {} finally { setHistoryLoading(false) }
  }, [])

  const filtered = team.filter((t) =>
    t.userName.toLowerCase().includes(search.toLowerCase()) ||
    t.userEmail.toLowerCase().includes(search.toLowerCase())
  )

  const checkedIn = team.filter((t) => t.attendance?.checkIn && !t.attendance?.checkOut).length
  const late = team.filter((t) => t.attendance?.status === 'late').length
  const absent = team.filter((t) => !t.attendance?.checkIn).length
  const present = team.filter((t) => t.attendance?.checkIn).length

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '24px' }}>
            <h1 className="rt-page-title">Team Attendance</h1>
            <p className="rt-page-subtitle">Today's attendance overview</p>
          </div>

          {/* Summary Cards */}
          <div className="rt-fade rt-d1 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Checked In', value: present, color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
              { label: 'Late Arrivals', value: late, color: '#dc2626', bg: '#fee2e2', icon: AlertTriangle },
              { label: 'Active Now', value: checkedIn, color: '#6366f1', bg: '#eef2ff', icon: Clock },
              { label: 'Absent', value: absent, color: '#64748b', bg: '#f1f5f9', icon: XCircle },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-2xl p-4" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + '20' }}>
                      <Icon size={15} color={s.color} />
                    </div>
                    <span className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
            {/* Team List */}
            <div className="rt-card rt-fade rt-d2">
              <div className="rt-card-header">
                <div className="flex items-center gap-2.5">
                  <div className="rt-card-icon" style={{ background: '#eef2ff' }}>
                    <Users size={16} color="#6366f1" />
                  </div>
                  <h2 className="rt-card-title">Team Members ({team.length})</h2>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="rt-input text-xs py-1.5 pl-8 w-[140px]"
                  />
                </div>
              </div>
              <div className="rt-card-body p-2">
                {loading ? (
                  <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No team members found.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {filtered.map((t) => {
                      const isLate = t.attendance?.status === 'late'
                      const isIn = !!t.attendance?.checkIn
                      const isOut = !!t.attendance?.checkOut
                      return (
                        <div
                          key={t.userId}
                          onClick={() => loadAgentHistory(t.userId, 1)}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150"
                          style={{
                            background: selectedAgentId === t.userId ? '#f5f3ff' : 'transparent',
                            border: selectedAgentId === t.userId ? '1px solid #ddd6fe' : '1px solid transparent',
                          }}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                            style={{ background: isLate ? '#fee2e2' : isIn ? '#dcfce7' : '#f1f5f9', color: isLate ? '#dc2626' : isIn ? '#16a34a' : '#94a3b8' }}>
                            {t.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-slate-900">{t.userName}</p>
                            <p className="text-xs text-slate-400 truncate">{t.userEmail}</p>
                          </div>
                          {!isIn ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">ABSENT</span>
                          ) : isLate ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">LATE</span>
                          ) : isOut ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">DONE</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">ACTIVE</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Agent History */}
            <div className="rt-card rt-fade rt-d3">
              <div className="rt-card-header">
                <div className="flex items-center gap-2.5">
                  <div className="rt-card-icon" style={{ background: '#f5f3ff' }}>
                    <Calendar size={16} color="#8b5cf6" />
                  </div>
                  <h2 className="rt-card-title">
                    {selectedAgentId
                      ? `History — ${team.find((t) => t.userId === selectedAgentId)?.userName || 'Agent'}`
                      : 'Select an Agent'}
                  </h2>
                </div>
              </div>
              <div className="rt-card-body">
                {!selectedAgentId ? (
                  <p className="text-sm text-slate-400 text-center py-8">Click on a team member to view their attendance history.</p>
                ) : historyLoading ? (
                  <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
                ) : agentHistory.items.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No attendance records found.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Date</th>
                              <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Check In</th>
                              <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Check Out</th>
                              <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Status</th>
                              <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Reason</th>
                              <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agentHistory.items.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td className="py-2.5 px-2 font-semibold text-slate-800">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                                <td className="py-2.5 px-2 text-slate-600">
                                  {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                                </td>
                                <td className="py-2.5 px-2 text-slate-600">
                                  {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                                </td>
                                <td className="py-2.5 px-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                                    background: r.status === 'late' ? '#fee2e2' : '#dcfce7',
                                    color: r.status === 'late' ? '#dc2626' : '#16a34a',
                                  }}>
                                    {r.status === 'late' ? 'LATE' : 'ON TIME'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[120px] truncate" title={r.reason || ''}>
                                  {r.reason || '-'}
                                </td>
                                <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[120px] truncate" title={r.notes || ''}>
                                  {r.notes || '-'}
                                </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {agentHistory.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                        <p className="text-xs text-slate-400">{agentHistory.total} records</p>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={agentHistory.page <= 1}
                            onClick={() => { const p = agentHistory.page - 1; setHistoryPage(p); loadAgentHistory(selectedAgentId, p) }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-xs font-semibold text-slate-500">{agentHistory.page} / {agentHistory.totalPages}</span>
                          <button
                            disabled={agentHistory.page >= agentHistory.totalPages}
                            onClick={() => { const p = agentHistory.page + 1; setHistoryPage(p); loadAgentHistory(selectedAgentId, p) }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
