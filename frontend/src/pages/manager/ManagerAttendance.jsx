import { useEffect, useState } from 'react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import { Search, CheckCircle, XCircle, Clock, X, ChevronLeft, ChevronRight, History } from 'lucide-react'

function formatDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return checkIn ? 'In progress' : '-'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours ? `${hours}h ${mins}m` : `${mins}m`
}

export default function ManagerAttendance() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [history, setHistory] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    api.get(endpoints.attendance.teamToday).then(res => setTeam(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openHistory = async (member) => {
    setSelectedMember(member)
    await fetchHistory(member.userId, 1)
  }

  const fetchHistory = async (userId, page = 1) => {
    setHistoryLoading(true)
    try {
      const res = await api.get(endpoints.attendance.agentHistory(userId), { params: { page, perPage: 15 } })
      setHistory(res.data)
    } catch { /* noop */ }
    setHistoryLoading(false)
  }

  const closeHistory = () => {
    setSelectedMember(null)
    setHistory({ items: [], total: 0, page: 1, totalPages: 0 })
  }

  const filtered = team.filter((t) =>
    t.userName.toLowerCase().includes(search.toLowerCase()) ||
    t.userEmail.toLowerCase().includes(search.toLowerCase())
  )

  const present = team.filter(t => t.attendance?.checkIn).length
  const absent = team.filter(t => !t.attendance?.checkIn).length

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '20px' }}>
            <h1 className="rt-page-title">Attendance</h1>
            <p className="rt-page-subtitle">Team attendance overview for today</p>
          </div>

          <div className="rt-fade grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl p-4 text-center flex items-center justify-center gap-2.5" style={{ background: '#dcfce7' }}>
              <CheckCircle size={18} color="#16a34a" />
              <div>
                <p className="text-xl font-extrabold" style={{ color: '#166534' }}>{present}</p>
                <p className="text-xs font-semibold" style={{ color: '#15803d' }}>Present</p>
              </div>
            </div>
            <div className="rounded-xl p-4 text-center flex items-center justify-center gap-2.5" style={{ background: '#fee2e2' }}>
              <XCircle size={18} color="#dc2626" />
              <div>
                <p className="text-xl font-extrabold" style={{ color: '#991b1b' }}>{absent}</p>
                <p className="text-xs font-semibold" style={{ color: '#b91c1c' }}>Absent</p>
              </div>
            </div>
          </div>

          <div className="rt-card rt-fade">
            <div className="rt-card-header justify-between gap-3">
              <div>
                <h2 className="rt-card-title">Today's Attendance</h2>
                <p className="text-sm text-slate-500">{team.length} staff members</p>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className="rt-input text-sm py-2 pl-10 pr-3 w-[240px]"
                />
              </div>
            </div>

            <div className="rt-card-body p-0 overflow-x-auto">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading attendance...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No attendance records found.</p>
              ) : (
                <table className="w-full min-w-[700px] text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-[0.16em]">
                      <th className="text-left px-4 py-3">Employee Name</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Check-In</th>
                      <th className="text-left px-4 py-3">Check-Out</th>
                      <th className="text-left px-4 py-3">Duration</th>
                      <th className="text-left px-4 py-3">Check-In Reason</th>
                      <th className="text-left px-4 py-3">Check-Out Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => {
                      const dateLabel = member.attendance?.date
                        ? new Date(member.attendance.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      const checkInLabel = member.attendance?.checkIn
                        ? new Date(member.attendance.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '-'
                      const checkOutLabel = member.attendance?.checkOut
                        ? new Date(member.attendance.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '-'
                      const durationLabel = formatDuration(member.attendance?.checkIn, member.attendance?.checkOut)
                      const status = member.attendance?.checkIn ? (member.attendance?.status === 'late' ? 'Late' : 'On time') : 'Absent'

                      const statusStyle = {
                        Late: { bg: '#fee2e2', color: '#b91c1c' },
                        'On time': { bg: '#dcfce7', color: '#166534' },
                        Absent: { bg: '#f1f5f9', color: '#64748b' },
                      }[status]

                      return (
                        <tr
                          key={member.userId}
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => openHistory(member)}
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{member.userName}</div>
                            <div className="text-xs text-slate-500 truncate">{member.userEmail}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                              <Clock size={11} />
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{dateLabel}</td>
                          <td className="px-4 py-4 text-slate-600">{checkInLabel}</td>
                          <td className="px-4 py-4 text-slate-600">{checkOutLabel}</td>
                          <td className="px-4 py-4 text-slate-600">
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{ background: statusStyle.bg, color: statusStyle.color }}
                            >
                              {durationLabel}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-500 text-xs max-w-[130px] truncate" title={member.attendance?.checkin_reason || ''}>
                            {member.attendance?.checkin_reason || '-'}
                          </td>
                          <td className="px-4 py-4 text-slate-500 text-xs max-w-[130px] truncate" title={member.attendance?.checkout_reason || ''}>
                            {member.attendance?.checkout_reason || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeHistory}>
          <div className="bg-white rounded-2xl w-[90%] max-w-[800px] shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <History size={16} color="#6366f1" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{selectedMember.userName}</h3>
                  <p className="text-xs text-slate-400">{selectedMember.userEmail} · Attendance History</p>
                </div>
              </div>
              <button onClick={closeHistory} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading history...</p>
              ) : history.items?.length === 0 ? (
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
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Checkin Reason</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Checkout Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.items.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-2.5 px-2 font-semibold text-slate-800">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
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
                                {r.status === 'late' ? 'LATE' : r.status === 'present' ? 'ON TIME' : r.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[130px] truncate" title={r.checkin_reason || ''}>
                              {r.checkin_reason || '-'}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[130px] truncate" title={r.checkout_reason || ''}>
                              {r.checkout_reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {history.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <p className="text-xs text-slate-400">{history.total} total records</p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={history.page <= 1}
                          onClick={() => fetchHistory(selectedMember.userId, history.page - 1)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-slate-500">{history.page} / {history.totalPages}</span>
                        <button
                          disabled={history.page >= history.totalPages}
                          onClick={() => fetchHistory(selectedMember.userId, history.page + 1)}
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
      )}
    </>
  )
}
