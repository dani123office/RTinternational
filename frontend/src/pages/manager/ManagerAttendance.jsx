import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { APP_STYLES } from '@/lib/styles'
import { Search } from 'lucide-react'

function formatDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return checkIn ? 'In progress' : '-'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours ? `${hours}h ${mins}m` : `${mins}m`
}

export default function ManagerAttendance() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get(endpoints.attendance.teamToday).then(res => setTeam(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = team.filter((t) =>
    t.userName.toLowerCase().includes(search.toLowerCase()) ||
    t.userEmail.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '20px' }}>
            <h1 className="rt-page-title">Attendance</h1>
            <p className="rt-page-subtitle">Simple team attendance view for today</p>
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
                <table className="w-full min-w-[600px] text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-[0.16em]">
                      <th className="text-left px-4 py-3">Employee Name</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Check-In</th>
                      <th className="text-left px-4 py-3">Check-Out</th>
                      <th className="text-left px-4 py-3">Duration</th>
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
                      const attendanceId = member.attendance?.id

                      return (
                        <tr
                          key={member.userId}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${attendanceId ? 'cursor-pointer' : 'cursor-default'}`}
                          onClick={() => attendanceId && navigate(`/${user?.role}/attendance/${attendanceId}`)}
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{member.userName}</div>
                            <div className="text-xs text-slate-500 truncate">{member.userEmail}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{dateLabel}</td>
                          <td className="px-4 py-4 text-slate-600">{checkInLabel}</td>
                          <td className="px-4 py-4 text-slate-600">{checkOutLabel}</td>
                          <td className="px-4 py-4 text-slate-600">
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{
                                background: status === 'Late' ? '#fee2e2' : status === 'On time' ? '#dcfce7' : '#f1f5f9',
                                color: status === 'Late' ? '#b91c1c' : status === 'On time' ? '#166534' : '#64748b',
                              }}
                            >
                              {durationLabel}
                            </span>
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
    </>
  )
}
