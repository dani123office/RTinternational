import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall, Clock, ArrowRight, Download, Filter } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'

const DOT_COLORS = {
  overdue: { dot: '#ef4444', ring: 'rgba(239,68,68,0.15)' },
  today: { dot: '#f59e0b', ring: 'rgba(245,158,11,0.15)' },
  upcoming: { dot: '#6366f1', ring: 'rgba(99,102,241,0.15)' },
}

export default function AdminCallbacks() {
  const navigate = useNavigate()
  const [callbacks, setCallbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [exporting, setExporting] = useState(false)

  const loadCallbacks = (params = {}) => {
    setLoading(true)
    api.get(endpoints.admin.callbacks, { params })
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
        setCallbacks(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadCallbacks()
    api.get(endpoints.admin.agents)
      .then(res => { setAgents(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
  }, [])

  const handleApply = () => {
    const params = {}
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    if (employeeId) params.employee_id = employeeId
    loadCallbacks(params)
  }

  const handleClear = () => {
    setFromDate('')
    setToDate('')
    setEmployeeId('')
    loadCallbacks()
  }

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both From Date and To Date')
      return
    }
    setExporting(true)
    try {
      const params = { from_date: fromDate, to_date: toDate }
      if (employeeId) params.employee_id = employeeId
      const res = await api.get(endpoints.admin.callbacksExport, { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `callbacks_${fromDate}_${toDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export callbacks')
    } finally {
      setExporting(false)
    }
  }

  const today = useMemo(() => new Date(), [])
  const todayStr = today.toDateString()

  const grouped = useMemo(() => {
    const active = callbacks.filter((cb) => cb.status !== 'done' && cb.status !== 'not_interested')
    const buckets = { overdue: [], today: [], upcoming: [] }
    active.forEach((cb) => {
      const d = new Date(cb.scheduledDateTime || cb.scheduledDate)
      if (d.toDateString() === todayStr) buckets.today.push(cb)
      else if (d < today) buckets.overdue.push(cb)
      else buckets.upcoming.push(cb)
    })
    const sort = (arr) => arr.sort((a, b) => new Date(a.scheduledDateTime || a.scheduledDate) - new Date(b.scheduledDateTime || b.scheduledDate))
    return { overdue: sort(buckets.overdue), today: sort(buckets.today), upcoming: sort(buckets.upcoming) }
  }, [callbacks, today, todayStr])

  if (loading) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Call back Feed</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>View and monitor all employee attendance records</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: exporting ? '#94a3b8' : '#4F46E5',
                color: '#fff',
                border: 'none',
                cursor: exporting ? 'not-allowed' : 'pointer',
                opacity: exporting ? 0.6 : 1,
              }}
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Export to Excel'}
            </button>
          </div>

          <div className="rt-card" style={{ marginBottom: '24px', padding: '20px' }}>
            <div className="flex items-center gap-2 mb-4">
              <Filter size={15} style={{ color: '#64748b' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                    fontSize: '14px', color: '#0f172a', background: '#fff', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                    fontSize: '14px', color: '#0f172a', background: '#fff', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                    fontSize: '14px', color: '#0f172a', background: '#fff', outline: 'none',
                    boxSizing: 'border-box', appearance: 'auto',
                  }}
                >
                  <option value="">All Employees</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApply}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none text-white"
                style={{ background: '#4F46E5' }}
              >
                Apply
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={{ background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0' }}
              >
                Clear
              </button>
            </div>
          </div>

          {!grouped.overdue.length && !grouped.today.length && !grouped.upcoming.length ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <PhoneCall size={20} color="#6366f1" opacity={0.5} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No callbacks found</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No active callbacks across all agents.</p>
            </div>
          ) : (
            <div className="rt-section-gap">
              {[['Overdue', grouped.overdue], ['Today', grouped.today], ['Upcoming', grouped.upcoming]].map(([title, list]) =>
                list.length > 0 && (
                  <div key={title}>
                    <div className="flex items-center gap-2.5 px-0 py-2">
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                        {title}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b' }}>
                        {list.length}
                      </span>
                    </div>
                    <div className="rt-section-gap">
                      {list.map((cb) => {
                        const d = new Date(cb.scheduledDateTime || cb.scheduledDate)
                        const isOverdue = d < today
                        const isUrgent = !isOverdue && d.toDateString() === todayStr
                        const dotKey = isOverdue ? 'overdue' : isUrgent ? 'today' : 'upcoming'
                        const dot = DOT_COLORS[dotKey]
                        return (
                          <div
                            key={cb.id}
                            onClick={() => navigate(`/admin/callbacks/${cb.id}`)}
                            className="rt-card-flat"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: dot.ring }}>
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot.dot }} />
                              </div>
                              <div className="min-w-0">
                                <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '14px', margin: 0, textTransform: 'capitalize' }}>
                                  {cb.customer?.businessName || cb.customer?.ownerName || 'Unknown'}
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0', textTransform: 'capitalize' }}>
                                  {cb.customer?.ownerName ? `Owner: ${cb.customer.ownerName}` : cb.notes?.slice(0, 60) || ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', fontSize: '12px' }}>
                                <Clock size={12} />
                                {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {d.toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true })}
                              </div>
                              <StatusBadge status={isOverdue ? 'overdue' : cb.status} type="callback" />
                              <ArrowRight size={14} style={{ color: '#d1d5db' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
