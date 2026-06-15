import { useEffect, useState, useCallback } from 'react'
import api, { endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Clock, LogIn, LogOut, History, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'

const TIME_OPTS = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }
const DATE_OPTS = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }

function formatTime(tz) {
  return new Date().toLocaleTimeString('en-US', { ...TIME_OPTS, timeZone: tz })
}

function formatDate(tz) {
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
        {formatTime(timezone)}
      </p>
      {sub && <p className="text-xs font-medium mt-1.5" style={{ color: '#64748b' }}>{sub}</p>}
    </div>
  )
}

export default function Attendance() {
  const { user } = useAuthStore()
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const [todayRecord, setTodayRecord] = useState(null)
  const [history, setHistory] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [stats, setStats] = useState({ presentCount: 0, lateCount: 0, absentCount: 0, totalDays: 0 })
  const [checkinReason, setCheckinReason] = useState('')
  const [checkoutReason, setCheckoutReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)

  const loadToday = useCallback(async () => {
    try {
      const res = await api.get(endpoints.attendance.today)
      setTodayRecord(res.data)
    } catch { setTodayRecord(null) }
  }, [])

  const loadHistory = useCallback(async (page = 1) => {
    try {
      const res = await api.get(endpoints.attendance.myHistory, { params: { page, perPage: 15 } })
      setHistory(res.data)
    } catch {}
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const now = new Date()
      const res = await api.get(endpoints.attendance.stats, {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      })
      setStats(res.data)
    } catch {}
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadToday(), loadHistory(historyPage), loadStats()])
    setLoading(false)
  }, [loadToday, loadHistory, historyPage, loadStats])

  useEffect(() => { loadAll() }, [loadAll])

  const handleCheckIn = async () => {
    setActionLoading(true)
    try {
      const res = await api.post(endpoints.attendance.checkIn, { checkin_reason: checkinReason || null })
      setTodayRecord(res.data)
      setCheckinReason('')
      await loadStats()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Check-in failed')
    } finally { setActionLoading(false) }
  }

  const handleCheckOut = async () => {
    setActionLoading(true)
    try {
      const res = await api.post(endpoints.attendance.checkOut, { checkout_reason: checkoutReason || null })
      setTodayRecord(res.data)
      setCheckoutReason('')
      await loadStats()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Check-out failed')
    } finally { setActionLoading(false) }
  }

  const isCheckedIn = !!todayRecord?.checkIn
  const isCheckedOut = !!todayRecord?.checkOut
  const todayStatus = todayRecord?.status

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

  const reasonRequired = !isCheckedIn && isLateByMoreThan(10)

  function isBefore10PM_PKT() {
    const d = getPKTNow()
    return d.getHours() < 22
  }

  const checkoutNotesRequired = isCheckedIn && !isCheckedOut && isBefore10PM_PKT()

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '28px' }}>
            <h1 className="rt-page-title">Attendance</h1>
            <p className="rt-page-subtitle">{formatDate('Asia/Karachi')}</p>
          </div>

          {/* Clocks */}
          <div className="rt-fade grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <ClockCard label="Pakistan Time (PKT)" timezone="Asia/Karachi" sub="Office Hours: 2:00 PM — 10:00 PM" accent="#6366f1" flag="UTC +5" />
            <ClockCard label="UK Time" timezone="Europe/London" sub="Office Hours: 10:00 AM — 6:00 PM" accent="#3b82f6" flag="BST/GMT" />
          </div>

          {/* Status Banner */}
          {todayRecord && (
            <div className="rt-fade rt-d1 mb-6 rounded-2xl p-4 flex items-center gap-3" style={{
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
          <div className="rt-fade rt-d1 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

          {/* Stats */}
          <div className="rt-fade rt-d2 grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Present', value: (stats.presentCount || 0) + (stats.lateCount || 0), color: '#16a34a', bg: '#dcfce7' },
              { label: 'Absent', value: stats.absentCount || 0, color: '#dc2626', bg: '#fee2e2' },
              { label: 'Total Days', value: stats.totalDays || 0, color: '#6366f1', bg: '#eef2ff' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* History */}
          <div className="rt-card rt-fade rt-d3">
            <div className="rt-card-header">
              <div className="flex items-center gap-2.5">
                <div className="rt-card-icon" style={{ background: '#eef2ff' }}>
                  <History size={16} color="#6366f1" />
                </div>
                <h2 className="rt-card-title">Attendance History</h2>
              </div>
            </div>
            <div className="rt-card-body">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
              ) : history.items.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No attendance records yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <th className="text-left py-3 px-2 font-semibold text-slate-500 text-xs uppercase">Date</th>
                          <th className="text-left py-3 px-2 font-semibold text-slate-500 text-xs uppercase">Check In</th>
                          <th className="text-left py-3 px-2 font-semibold text-slate-500 text-xs uppercase">Check Out</th>
                          <th className="text-left py-3 px-2 font-semibold text-slate-500 text-xs uppercase">Status</th>
                          <th className="text-left py-3 px-2 font-semibold text-slate-500 text-xs uppercase">Checkin Reason</th>
                          <th className="text-left py-3 px-2 font-semibold text-slate-500 text-xs uppercase">Checkout Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.items.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-3 px-2 font-semibold text-slate-800">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="py-3 px-2 text-slate-600">
                              {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                            </td>
                            <td className="py-3 px-2 text-slate-600">
                              {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                                background: r.status === 'late' ? '#fee2e2' : '#dcfce7',
                                color: r.status === 'late' ? '#dc2626' : '#16a34a',
                              }}>
                                {r.status === 'late' ? 'LATE' : r.status === 'present' ? 'ON TIME' : r.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-500 text-xs max-w-[140px] truncate" title={r.checkin_reason || ''}>
                              {r.checkin_reason || '-'}
                            </td>
                            <td className="py-3 px-2 text-slate-500 text-xs max-w-[140px] truncate" title={r.checkout_reason || ''}>
                              {r.checkout_reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {history.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <p className="text-xs text-slate-400">{history.total} total records</p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={history.page <= 1}
                          onClick={() => { setHistoryPage(p => p - 1); loadHistory(history.page - 1) }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-slate-500">{history.page} / {history.totalPages}</span>
                        <button
                          disabled={history.page >= history.totalPages}
                          onClick={() => { setHistoryPage(p => p + 1); loadHistory(history.page + 1) }}
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
    </>
  )
}
