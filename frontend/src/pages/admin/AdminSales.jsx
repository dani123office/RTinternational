import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PoundSterling, ArrowRight, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'

export default function AdminSales() {
  const navigate = useNavigate()
  const mounted = useRef(false)

  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  useEffect(() => {
    api.get(endpoints.admin.agents)
      .then(res => { setAgents(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
  }, [])

  function loadSales(p = 1) {
    setLoading(true)
    const params = { page: p, per_page: 20 }
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    if (employeeId) params.employee_id = employeeId
    api.get(endpoints.admin.sales, { params })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    loadSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = () => loadSales(1)

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both From Date and To Date')
      return
    }
    try {
      const params = { from_date: fromDate, to_date: toDate }
      if (employeeId) params.employee_id = employeeId
      const res = await api.get(endpoints.admin.salesExport, { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `sales_${fromDate}_${toDate}.xlsx`
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

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="rt-fade flex items-center justify-between mb-6">
            <div>
              <h1 className="rt-page-title">Sale Feed</h1>
              <p className="rt-page-subtitle">View and monitor all employee sale records</p>
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
                      <th className="text-left px-4 py-3">Customer</th>
                      <th className="text-left px-4 py-3">Employee</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Commission</th>
                      <th className="text-left px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/sales/${s.id}`, { state: { agentId: s.employeeId } })}
                      >
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{formatDate(s.createdAt)}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{s.customer?.businessName || s.ownerFullName || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 truncate">{s.customer?.ownerName ? `Owner: ${s.customer.ownerName}` : ''}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{s.agentName || '-'}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={s.cotStatus || s.status} type="sale" />
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">£{(s.commissionAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[140px] truncate" title={s.notes || ''}>
                          {s.notes || '-'}
                        </td>
                      </tr>
                    ))}
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
                    onClick={() => loadSales(data.page - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-semibold text-slate-500">{data.page} / {data.totalPages}</span>
                  <button
                    disabled={data.page >= data.totalPages}
                    onClick={() => loadSales(data.page + 1)}
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
