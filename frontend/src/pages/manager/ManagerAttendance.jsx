import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { APP_STYLES } from '@/lib/styles'
import { Search, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'

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

  const present = team.filter(t => t.attendance?.checkIn && t.attendance?.status !== 'late').length
  const late = team.filter(t => t.attendance?.status === 'late').length
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

          <div className="rt-fade grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl p-4 text-center flex items-center justify-center gap-2.5" style={{ background: '#dcfce7' }}>
              <CheckCircle size={18} color="#16a34a" />
              <div>
                <p className="text-xl font-extrabold" style={{ color: '#166534' }}>{present}</p>
                <p className="text-xs font-semibold" style={{ color: '#15803d' }}>Present</p>
              </div>
            </div>
            <div className="rounded-xl p-4 text-center flex items-center justify-center gap-2.5" style={{ background: '#fef3c7' }}>
              <AlertTriangle size={18} color="#d97706" />
              <div>
                <p className="text-xl font-extrabold" style={{ color: '#92400e' }}>{late}</p>
                <p className="text-xs font-semibold" style={{ color: '#b45309' }}>Late</p>
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
                      const attendanceId = member.attendance?.id

                      const statusStyle = {
                        Late: { bg: '#fee2e2', color: '#b91c1c' },
                        'On time': { bg: '#dcfce7', color: '#166534' },
                        Absent: { bg: '#f1f5f9', color: '#64748b' },
                      }[status]

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
    </>
  )
}
