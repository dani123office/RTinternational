import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, Download, Filter, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'

export default function AdminTransfers() {
  const navigate = useNavigate()
  const mounted = useRef(false)

  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [fromDate, setFromDate] = useState(() => {
    const dashboardMonth = localStorage.getItem('adminSelectedMonth') || 'all'
    const lastDashMonth = sessionStorage.getItem('admin_transfers_last_dashboard_month')
    if (dashboardMonth !== lastDashMonth) {
      sessionStorage.setItem('admin_transfers_last_dashboard_month', dashboardMonth)
      if (dashboardMonth !== 'all') {
        const [year, month] = dashboardMonth.split('-').map(Number)
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDayDate = new Date(year, month, 0)
        const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`
        sessionStorage.setItem('admin_transfers_from_date', firstDay)
        sessionStorage.setItem('admin_transfers_to_date', lastDay)
        return firstDay
      } else {
        sessionStorage.setItem('admin_transfers_from_date', '')
        sessionStorage.setItem('admin_transfers_to_date', '')
        return ''
      }
    }
    return sessionStorage.getItem('admin_transfers_from_date') || ''
  })
  const [toDate, setToDate] = useState(() => {
    return sessionStorage.getItem('admin_transfers_to_date') || ''
  })
  const [employeeId, setEmployeeId] = useState(() => sessionStorage.getItem('admin_transfers_employee_id') || '')

  useEffect(() => {
    api.get(endpoints.admin.agents)
      .then(res => { setAgents(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
  }, [])

  function loadTransfers(p = 1) {
    setLoading(true)
    const params = { page: p, per_page: 20 }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim()
    } else {
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
    }
    if (employeeId) params.employee_id = employeeId

    sessionStorage.setItem('admin_transfers_from_date', fromDate)
    sessionStorage.setItem('admin_transfers_to_date', toDate)
    sessionStorage.setItem('admin_transfers_employee_id', employeeId)
    sessionStorage.setItem('admin_transfers_page', String(p))

    api.get(endpoints.admin.transfers, { params })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isFirstLoad) {
      setIsFirstLoad(false)
      const savedPage = Number(sessionStorage.getItem('admin_transfers_page') || '1')
      loadTransfers(savedPage)
      return
    }
    const delayDebounceFn = setTimeout(() => {
      loadTransfers(1)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const handleFilter = () => loadTransfers(1)

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both From Date and To Date')
      return
    }
    try {
      const params = { from_date: fromDate, to_date: toDate }
      if (employeeId) params.employee_id = employeeId
      const res = await api.get(endpoints.admin.transfersExport, { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `transfers_${fromDate}_${toDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch { /* noop */ }
  }

  function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filteredItems = data.items

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="rt-fade flex items-center justify-between mb-6">
            <div>
              <h1 className="rt-page-title">Transfer Feed</h1>
              <p className="rt-page-subtitle">View and monitor all employee transfer records</p>
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
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="rt-input text-sm py-2 px-3 w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">To Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="rt-input text-sm py-2 px-3 w-full"
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
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
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
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rt-input text-sm py-2 pl-9 pr-3 w-56 rounded-xl"
                />
              </div>
            </div>
            <div className="rt-card-body p-0 overflow-x-auto">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading records...</p>
              ) : filteredItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No records found for the selected filters.</p>
              ) : (
                <table className="w-full min-w-[750px] text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-[0.16em]">
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Customer</th>
                      <th className="text-left px-4 py-3">Employee</th>
                      <th className="text-left px-4 py-3">Supplier</th>
                      <th className="text-left px-4 py-3">Utility</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((t) => {
                      const supplier = t.customer?.electricityMeters?.[0]?.currentSupplier || t.customer?.gasMeters?.[0]?.currentSupplier || '-'
                      return (
                      <tr
                        key={t.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/transfers/${t.id}`, { state: { agentId: t.employeeId } })}
                      >
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{formatDate(t.createdAt)}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{t.customer?.businessName || t.ownerFullName || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 truncate">{t.customer?.ownerName ? `Owner: ${t.customer.ownerName}` : ''}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{t.agentName || '-'}</td>
                        <td className="px-4 py-3.5 text-slate-700 capitalize">{supplier}</td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs capitalize">{t.utilityType || '-'}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={t.status} type="transfer" />
                        </td>
                      </tr>
                    )})}
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
                    onClick={() => loadTransfers(data.page - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-semibold text-slate-500">{data.page} / {data.totalPages}</span>
                  <button
                    disabled={data.page >= data.totalPages}
                    onClick={() => loadTransfers(data.page + 1)}
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
