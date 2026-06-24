import { useEffect, useState, useCallback } from 'react'
import api, { endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toastContext'
import { APP_STYLES } from '@/lib/styles'
import { Search, CheckCircle, XCircle, Clock, X, ChevronLeft, ChevronRight, History, AlertTriangle, Loader2, LogIn, LogOut, MapPin } from 'lucide-react'

const TIME_OPTS = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }
const DATE_OPTS = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }

function fmtTime(tz) {
  return new Date().toLocaleTimeString('en-US', { ...TIME_OPTS, timeZone: tz })
}

function fmtDate(tz) {
  return new Date().toLocaleDateString('en-GB', { ...DATE_OPTS, timeZone: tz })
}

function ClockCard({ label, timezone, sub, accent, flag }) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.5)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
    }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + '20' }}>
          <MapPin size={16} style={{ color: accent }} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</p>
          {flag && <span className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>{flag}</span>}
        </div>
      </div>
      <p className="text-3xl font-extrabold tracking-tight" style={{ color: '#0f172a', fontFamily: "'DM Sans', monospace", letterSpacing: '-0.03em' }}>
        {fmtTime(timezone)}
      </p>
      {sub && <p className="text-xs font-medium mt-1.5" style={{ color: '#64748b' }}>{sub}</p>}
    </div>
  )
}

function formatDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return checkIn ? 'In progress' : '-'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours ? `${hours}h ${mins}m` : `${mins}m`
}

export default function ManagerAttendance() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  /* ── clock tick ── */
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  /* ── own attendance state ── */
  const [todayRecord, setTodayRecord] = useState(null)
  const [myStats, setMyStats] = useState({ presentCount: 0, lateCount: 0, absentCount: 0, totalDays: 0 })
  const [myHistory, setMyHistory] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [myHistoryPage, setMyHistoryPage] = useState(1)
  const [checkinReason, setCheckinReason] = useState('')
  const [checkoutReason, setCheckoutReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showLateReport, setShowLateReport] = useState(false)
  const [lateDate, setLateDate] = useState('')
  const [lateTime, setLateTime] = useState('')
  const [lateReasonText, setLateReasonText] = useState('')
  const [lateSubmitting, setLateSubmitting] = useState(false)
  const [showMyHistory, setShowMyHistory] = useState(false)

  /* ── team state ── */
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [history, setHistory] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showLateModal, setShowLateModal] = useState(false)
  const [lateData, setLateData] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [lateLoading, setLateLoading] = useState(false)
  const [lateFromDate, setLateFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [lateToDate, setLateToDate] = useState(new Date().toISOString().split('T')[0])

  /* ── own attendance loaders ── */
  const loadToday = useCallback(async () => {
    try {
      const res = await api.get(endpoints.attendance.today)
      setTodayRecord(res.data)
    } catch { setTodayRecord(null) }
  }, [])

  const loadMyStats = useCallback(async () => {
    try {
      const now = new Date()
      const res = await api.get(endpoints.attendance.stats, {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      })
      setMyStats(res.data)
    } catch {}
  }, [])

  const loadMyHistory = useCallback(async (page = 1) => {
    try {
      const res = await api.get(endpoints.attendance.myHistory, { params: { page, perPage: 15 } })
      setMyHistory(res.data)
    } catch {}
  }, [])

  /* ── check-in / check-out ── */
  const handleCheckIn = async () => {
    setActionLoading(true)
    try {
      const res = await api.post(endpoints.attendance.checkIn, { checkin_reason: checkinReason || null })
      setTodayRecord(res.data)
      setCheckinReason('')
      toast('Checked in successfully', 'success')
      await loadMyStats()
    } catch (err) {
      toast(err?.response?.data?.detail || 'Check-in failed', 'error')
    } finally { setActionLoading(false) }
  }

  const handleCheckOut = async () => {
    setActionLoading(true)
    try {
      const res = await api.post(endpoints.attendance.checkOut, { checkout_reason: checkoutReason || null })
      setTodayRecord(res.data)
      setCheckoutReason('')
      toast('Checked out successfully', 'success')
      await loadMyStats()
    } catch (err) {
      toast(err?.response?.data?.detail || 'Check-out failed', 'error')
    } finally { setActionLoading(false) }
  }

  const handleReportLate = async () => {
    if (!lateDate) { toast('Please select a date', 'error'); return }
    if (!lateTime) { toast('Please select expected arrival time', 'error'); return }
    if (!lateReasonText.trim()) { toast('Please explain the reason for late arrival', 'error'); return }
    setLateSubmitting(true)
    try {
      await api.post(endpoints.attendance.reportLateArrival, {
        date: lateDate,
        expected_arrival_time: lateTime + ':00',
        reason: lateReasonText.trim(),
      })
      toast('Late arrival reported successfully', 'success')
      setShowLateReport(false)
      setLateDate(''); setLateTime(''); setLateReasonText('')
      await loadMyStats()
    } catch (err) {
      toast(err?.response?.data?.detail || 'Failed to report late arrival', 'error')
    } finally { setLateSubmitting(false) }
  }

  /* ── late time helpers ── */
  function getPKTNow() {
    const pktString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
    return new Date(pktString)
  }

  function isLateByMoreThan(minutes) {
    const d = getPKTNow()
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Asia/Karachi' })
    const h = d.getHours()
    const m = d.getMinutes()
    const threshold = (weekday === 'Friday') ? { h: 15, m: 10 } : { h: 14, m: 10 }
    const totalLateMinutes = (h - threshold.h) * 60 + (m - threshold.m)
    return totalLateMinutes > minutes
  }

  const isCheckedIn = !!todayRecord?.checkIn
  const isCheckedOut = !!todayRecord?.checkOut
  const todayStatus = todayRecord?.status
  const reasonRequired = !isCheckedIn && isLateByMoreThan(10)

  function isBefore10PM_PKT() {
    const d = getPKTNow()
    return d.getHours() < 22
  }
  const checkoutNotesRequired = isCheckedIn && !isCheckedOut && isBefore10PM_PKT()

  /* ── team loaders ── */
  useEffect(() => {
    const promises = [
      api.get(endpoints.attendance.teamToday).then(res => setTeam(res.data)).catch(() => {}),
    ]
    if (isAdmin) {
      promises.push(loadToday(), loadMyStats())
    }
    Promise.all(promises).finally(() => setLoading(false))
  }, [loadToday, loadMyStats, isAdmin])

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

  const loadLateArrivals = async (p = 1) => {
    setLateLoading(true)
    try {
      const res = await api.get(endpoints.attendance.lateArrivals, { params: { from_date: lateFromDate, to_date: lateToDate, page: p, per_page: 20 } })
      setLateData(res.data)
    } catch { /* noop */ }
    setLateLoading(false)
  }

  const openLateModal = () => {
    setShowLateModal(true)
    loadLateArrivals(1)
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

          {/* ═══ MY ATTENDANCE SECTION (admin only) ═══ */}
          {isAdmin && (<>
          <div className="rt-fade flex items-center justify-between" style={{ marginBottom: '20px' }}>
            <div>
              <h1 className="rt-page-title">My Attendance</h1>
              <p className="rt-page-subtitle">{fmtDate('Asia/Karachi')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowMyHistory(true); loadMyHistory(1) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer border-0 transition-all"
                style={{ background: '#eef2ff', color: '#4f46e5' }}
              >
                <History size={16} /> My History
              </button>
              <button
                onClick={() => { setLateDate(new Date().toISOString().split('T')[0]); setShowLateReport(true) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer border-0 transition-all"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <AlertTriangle size={16} /> Report Late
              </button>
            </div>
          </div>

          {/* Clocks */}
          <div className="rt-fade grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <ClockCard label="Pakistan Time (PKT)" timezone="Asia/Karachi" sub="Office Hours: 2:00 PM — 10:00 PM" accent="#6366f1" flag="UTC +5" />
            <ClockCard label="UK Time" timezone="Europe/London" sub="Office Hours: 10:00 AM — 6:00 PM" accent="#3b82f6" flag="BST/GMT" />
          </div>

          {/* Status Banner */}
          {todayRecord && (
            <div className="rt-fade rt-d1 mb-5 rounded-2xl p-4 flex items-center gap-3" style={{
              background: todayStatus === 'late' ? 'linear-gradient(135deg, #fef2f2, #fff5f5)' : 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
              border: todayStatus === 'late' ? '1px solid #fecaca' : '1px solid #bbf7d0',
            }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: todayStatus === 'late' ? '#fee2e2' : '#dcfce7',
              }}>
                <Clock size={18} color={todayStatus === 'late' ? '#ef4444' : '#16a34a'} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: todayStatus === 'late' ? '#7f1d1d' : '#166534' }}>
                  {todayStatus === 'late' ? 'Checked in Late' : todayStatus === 'present' ? 'Checked in — On Time' : 'Present'}
                </p>
                <p className="text-xs font-medium mt-0.5" style={{ color: todayStatus === 'late' ? '#b91c1c' : '#15803d' }}>
                  {todayRecord.checkIn ? `Check-in: ${new Date(todayRecord.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                  {todayRecord.checkOut ? ` · Check-out: ${new Date(todayRecord.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                background: todayStatus === 'late' ? '#fee2e2' : '#dcfce7',
                color: todayStatus === 'late' ? '#dc2626' : '#16a34a',
              }}>
                {todayStatus === 'late' ? 'LATE' : 'ON TIME'}
              </span>
            </div>
          )}

          {/* Check In/Out Cards */}
          <div className="rt-fade rt-d1 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="rounded-2xl p-6 relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
            }}>
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <LogIn size={18} color="white" />
                  </div>
                  <p className="text-white font-bold text-lg">Check In</p>
                </div>
                {isCheckedIn ? (
                  <div className="text-white/80 text-sm font-medium">
                    <p>Checked in at {new Date(todayRecord.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    {todayRecord.checkin_reason && <p className="mt-1 text-white/60 text-xs">Checkin Reason: {todayRecord.checkin_reason}</p>}
                  </div>
                ) : (
                  <>
                    <input
                      value={checkinReason}
                      onChange={(e) => setCheckinReason(e.target.value)}
                      placeholder={reasonRequired ? 'Checkin reason (required)...' : 'Checkin reason (optional)...'}
                      className="w-full px-3.5 py-2.5 rounded-xl border-0 text-sm mb-1"
                      style={{ background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none' }}
                    />
                    {reasonRequired && !checkinReason.trim() && (
                      <p className="text-[11px] font-medium mb-2" style={{ color: '#fca5a5' }}>
                        Checkin reason required (more than 10 min late)
                      </p>
                    )}
                    <button
                      onClick={handleCheckIn}
                      disabled={actionLoading || (reasonRequired && !checkinReason.trim())}
                      className="w-full py-2.5 rounded-xl border-0 font-bold text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
                      style={{ background: 'white', color: '#4f46e5' }}
                    >
                      {actionLoading ? 'Checking in...' : 'Check In Now'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl p-6 relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <LogOut size={18} color="white" />
                  </div>
                  <p className="text-white font-bold text-lg">Check Out</p>
                </div>
                {!isCheckedIn ? (
                  <p className="text-white/50 text-sm font-medium">Check in first to enable check-out</p>
                ) : isCheckedOut ? (
                  <div className="text-white/80 text-sm font-medium">
                    <p>Checked out at {new Date(todayRecord.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    {todayRecord.checkout_reason && <p className="mt-1 text-white/60 text-xs">Checkout Reason: {todayRecord.checkout_reason}</p>}
                  </div>
                ) : (
                  <>
                    <input
                      value={checkoutReason}
                      onChange={(e) => setCheckoutReason(e.target.value)}
                      placeholder={checkoutNotesRequired ? 'Checkout reason (required)...' : 'Checkout reason (optional)...'}
                      className="w-full px-3.5 py-2.5 rounded-xl border-0 text-sm mb-1"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                    />
                    {checkoutNotesRequired && !checkoutReason.trim() && (
                      <p className="text-[11px] font-medium mb-2" style={{ color: '#fca5a5' }}>
                        Checkout reason required before 10 PM
                      </p>
                    )}
                    <button
                      onClick={handleCheckOut}
                      disabled={actionLoading || (checkoutNotesRequired && !checkoutReason.trim())}
                      className="w-full py-2.5 rounded-xl border-0 font-bold text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                    >
                      {actionLoading ? 'Checking out...' : 'Check Out Now'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Personal Stats */}
          <div className="rt-fade rt-d2 grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Present', value: (myStats.presentCount || 0) + (myStats.lateCount || 0), color: '#16a34a', bg: '#dcfce7' },
              { label: 'Absent', value: myStats.absentCount || 0, color: '#dc2626', bg: '#fee2e2' },
              { label: 'Total Days', value: myStats.totalDays || 0, color: '#6366f1', bg: '#eef2ff' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* ═══ Divider ═══ */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', marginBottom: '28px' }} />
          </>)}

          {/* ═══ TEAM ATTENDANCE SECTION ═══ */}
          <div className="rt-fade flex items-center justify-between" style={{ marginBottom: '20px' }}>
            <div>
              <h1 className="rt-page-title">Team Attendance</h1>
              <p className="rt-page-subtitle">Team attendance overview for today</p>
            </div>
            <button
              onClick={openLateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer border-0 transition-all"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <AlertTriangle size={16} /> Late Arrivals
            </button>
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

      {/* ═══ MY HISTORY MODAL ═══ */}
      {isAdmin && showMyHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowMyHistory(false)}>
          <div className="bg-white rounded-2xl w-[90%] max-w-[800px] shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <History size={16} color="#6366f1" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">My Attendance History</h3>
                  <p className="text-xs text-slate-400">{user?.fullName || user?.email} · {myHistory.total} total records</p>
                </div>
              </div>
              <button onClick={() => setShowMyHistory(false)} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {myHistory.items?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No attendance records yet.</p>
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
                        {myHistory.items.map((r) => (
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
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[130px] truncate" title={r.checkin_reason || ''}>{r.checkin_reason || '-'}</td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[130px] truncate" title={r.checkout_reason || ''}>{r.checkout_reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {myHistory.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <p className="text-xs text-slate-400">{myHistory.total} total records</p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={myHistory.page <= 1}
                          onClick={() => { setMyHistoryPage(p => p - 1); loadMyHistory(myHistory.page - 1) }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-slate-500">{myHistory.page} / {myHistory.totalPages}</span>
                        <button
                          disabled={myHistory.page >= myHistory.totalPages}
                          onClick={() => { setMyHistoryPage(p => p + 1); loadMyHistory(myHistory.page + 1) }}
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

      {/* ═══ REPORT LATE ARRIVAL MODAL ═══ */}
      {isAdmin && showLateReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', width: '480px', maxWidth: '92vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', fontFamily: "'DM Sans', serif" }}>
                Report Late Arrival
              </h2>
              <button
                onClick={() => setShowLateReport(false)}
                className="flex items-center justify-center cursor-pointer border-0 rounded-lg bg-transparent"
                style={{ width: 32, height: 32, color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Date</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={lateDate}
                        onChange={(e) => setLateDate(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 14px', border: '2px solid #3b82f6', borderRadius: '10px',
                          fontSize: '14px', color: '#0f172a', outline: 'none', background: '#fff',
                        }}
                      />
                      <Clock size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Exp. Arrival Time</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="time"
                        value={lateTime}
                        onChange={(e) => setLateTime(e.target.value)}
                        placeholder="--:--"
                        style={{
                          width: '100%', padding: '10px 14px', border: '1px solid #e2e6ec', borderRadius: '10px',
                          fontSize: '14px', color: '#0f172a', outline: 'none', background: '#f8fafc',
                        }}
                      />
                      <Clock size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Reason</label>
                  <textarea
                    value={lateReasonText}
                    onChange={(e) => setLateReasonText(e.target.value)}
                    placeholder="Explain the reason for late arrival..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 14px', border: '1px solid #e2e6ec', borderRadius: '10px',
                      fontSize: '14px', color: '#0f172a', outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit', background: '#f8fafc',
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '10px',
              padding: '16px 24px', borderTop: '1px solid #f1f5f9',
            }}>
              <button
                onClick={() => setShowLateReport(false)}
                className="cursor-pointer"
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                  background: '#fff', color: '#0f172a', fontSize: '13px', fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReportLate}
                disabled={lateSubmitting}
                className="flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 600,
                }}
              >
                {lateSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                {lateSubmitting ? 'Submitting...' : 'Submit Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AGENT HISTORY MODAL ═══ */}
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

      {/* ═══ TEAM LATE ARRIVALS MODAL ═══ */}
      {showLateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLateModal(false)}>
          <div className="bg-white rounded-2xl w-[90%] max-w-[900px] shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                  <AlertTriangle size={16} color="#d97706" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Late Arrival Reports</h3>
                  <p className="text-xs text-slate-400">{lateData.total} total reports</p>
                </div>
              </div>
              <button onClick={() => setShowLateModal(false)} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">From</label>
                <input type="date" value={lateFromDate} onChange={(e) => setLateFromDate(e.target.value)}
                  className="rt-input text-sm py-1.5 px-3 rounded-lg border border-slate-200" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">To</label>
                <input type="date" value={lateToDate} onChange={(e) => setLateToDate(e.target.value)}
                  className="rt-input text-sm py-1.5 px-3 rounded-lg border border-slate-200" />
              </div>
              <button onClick={() => loadLateArrivals(1)}
                className="mt-5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer border-0"
                style={{ background: '#6366f1' }}>
                Filter
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {lateLoading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading late arrivals...</p>
              ) : lateData.items?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No late arrival reports found.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Date</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Employee</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Exp. Arrival</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Actual Check-In</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lateData.items.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-2.5 px-2 font-semibold text-slate-800">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="py-2.5 px-2">
                              <div className="font-semibold text-slate-800 text-xs">{r.userName}</div>
                              <div className="text-xs text-slate-400">{r.userEmail}</div>
                            </td>
                            <td className="py-2.5 px-2 text-slate-600 text-xs">{r.expected_arrival_time || '-'}</td>
                            <td className="py-2.5 px-2 text-slate-600 text-xs">
                              {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[200px]" title={r.late_arrival_reason || ''}>
                              {r.late_arrival_reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {lateData.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <p className="text-xs text-slate-400">{lateData.total} total records</p>
                      <div className="flex items-center gap-2">
                        <button disabled={lateData.page <= 1} onClick={() => loadLateArrivals(lateData.page - 1)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40">
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-slate-500">{lateData.page} / {lateData.totalPages}</span>
                        <button disabled={lateData.page >= lateData.totalPages} onClick={() => loadLateArrivals(lateData.page + 1)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40">
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
