import { useEffect, useState, useRef } from 'react'
import api, { endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { APP_STYLES } from '@/lib/styles'
import { Download, Filter, CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

export default function AttendanceFeed() {
  const { user } = useAuthStore()
  const mounted = useRef(false)

  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [toDate, setToDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [employeeId, setEmployeeId] = useState('')

  useEffect(() => {
    api.get('/api/auth/users').then(res => {
      const all = res.data || []
      const filtered = user?.role === 'admin'
        ? all
        : all.filter(e => e.managerId === user?.id && e.role === 'agent')
      setEmployees(filtered)
    }).catch(() => { /* noop */ })
  }, [user])

  function loadAttend() {
    setLoading(true)
    api.get(endpoints.attendance.feed, { params: { from_date: fromDate, to_date: toDate, page: 1, per_page: 20 } })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    loadAttend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchFeed = async (p = 1) => {
    setLoading(true)
    try {
      const params = { from_date: fromDate, to_date: toDate, page: p, per_page: 20 }
      if (employeeId) params.employee_id = employeeId
      const res = await api.get(endpoints.attendance.feed, { params })
      setData(res.data)
    } catch { /* noop */ }
    setLoading(false)
  }

  const handleFilter = () => fetchFeed(1)

  const handleExport = async () => {
    try {
      const params = { from_date: fromDate, to_date: toDate }
      if (employeeId) params.employee_id = employeeId
      const res = await api.get(endpoints.attendance.export, {
        params,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance_${fromDate}_${toDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch { /* noop */ }
  }

  function formatTime(t) {
    if (!t) return '-'
    return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const statusStyle = {
    present: { bg: '#dcfce7', color: '#16a34a', label: 'Present' },
    late: { bg: '#fee2e2', color: '#dc2626', label: 'Late' },
    absent: { bg: '#f1f5f9', color: '#64748b', label: 'Absent' },
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="rt-fade flex items-center justify-between mb-6">
            <div>
              <h1 className="rt-page-title">Attendance Feed</h1>
              <p className="rt-page-subtitle">View and monitor all employee attendance records</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer border-0 transition-all duration-200 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              <Download size={16} />
              Export to Excel
            </button>
          </div>

          <div className="rt-card rt-fade mb-6">
            <div className="rt-card-body">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <Filter size={13} color="#6366f1" />
                </div>
                <span className="text-sm font-bold text-slate-700">Filters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">From Date</label>
                  <div className="relative">
                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="rt-input text-sm py-2 pl-9 pr-3 w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">To Date</label>
                  <div className="relative">
                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="rt-input text-sm py-2 pl-9 pr-3 w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Employee</label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="rt-input text-sm py-2 px-3 w-full"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleFilter}
                  className="py-2 px-5 rounded-xl text-sm font-bold text-white cursor-pointer border-0 transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', height: '38px' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          <div className="rt-card rt-fade">
            <div className="rt-card-header">
              <div>
                <h2 className="rt-card-title">Records</h2>
                <p className="text-sm text-slate-500">{data.total} total entries</p>
              </div>
            </div>
            <div className="rt-card-body p-0 overflow-x-auto">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading records...</p>
              ) : data.items?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No records found for the selected filters.</p>
              ) : (
                <table className="w-full min-w-[750px] text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-[0.16em]">
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Employee Name</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Check In</th>
                      <th className="text-left px-4 py-3">Check Out</th>
                      <th className="text-left px-4 py-3">Check-in Reason</th>
                      <th className="text-left px-4 py-3">Check-out Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => {
                      const s = statusStyle[r.status] || statusStyle.absent
                      return (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-slate-800">{formatDate(r.date)}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900">{r.userName}</div>
                            <div className="text-xs text-slate-500 truncate">{r.userEmail}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                              <Clock size={11} />
                              {s.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{formatTime(r.checkIn)}</td>
                          <td className="px-4 py-3.5 text-slate-600">{formatTime(r.checkOut)}</td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[130px] truncate" title={r.checkin_reason || ''}>
                            {r.checkin_reason || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[130px] truncate" title={r.checkout_reason || ''}>
                            {r.checkout_reason || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                <p className="text-xs text-slate-400">{data.total} total records</p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={data.page <= 1}
                    onClick={() => fetchFeed(data.page - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-semibold text-slate-500">{data.page} / {data.totalPages}</span>
                  <button
                    disabled={data.page >= data.totalPages}
                    onClick={() => fetchFeed(data.page + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}