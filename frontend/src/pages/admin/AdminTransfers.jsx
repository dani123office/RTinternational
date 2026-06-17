import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, Download, Filter } from 'lucide-react'
import api, { endpoints, extractData } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'

export default function AdminTransfers() {
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [exporting, setExporting] = useState(false)

  const loadTransfers = (params = {}) => {
    setLoading(true)
    api.get(endpoints.admin.transfers, { params })
      .then(res => { setTransfers(extractData(res)); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadTransfers()
    api.get(endpoints.admin.agents)
      .then(res => { setAgents(Array.isArray(res.data) ? res.data : []) })
      .catch(() => {})
  }, [])

  const handleApply = () => {
    const params = {}
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    if (employeeId) params.employee_id = employeeId
    loadTransfers(params)
  }

  const handleClear = () => {
    setFromDate('')
    setToDate('')
    setEmployeeId('')
    loadTransfers()
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
      const res = await api.get(endpoints.admin.transfersExport, { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `transfers_${fromDate}_${toDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export transfers')
    } finally {
      setExporting(false)
    }
  }

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
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Transfer Feed</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>View and monitor all employee transfer records</p>
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

          {transfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ArrowLeftRight size={20} color="#22c55e" opacity={0.5} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No transfers found</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No transfers across all agents.</p>
            </div>
          ) : (
            <div className="rt-section-gap">
              {transfers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/admin/transfers/${t.id}`, { state: { agentId: t.employeeId } })}
                  className="rt-card-flat"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                      <ArrowLeftRight size={16} color="#22c55e" />
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '14px', margin: 0, textTransform: 'capitalize' }}>
                        {t.customer?.businessName || t.ownerFullName || 'Unknown'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0', textTransform: 'capitalize' }}>
                        {t.customer?.ownerName ? `Owner: ${t.customer.ownerName}` : t.notes?.slice(0, 60) || ''}
                        {t.agentName && <span> &middot; {t.agentName}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', textTransform: 'capitalize' }}>
                      {t.utilityType || 'N/A'}
                    </span>
                    <StatusBadge status={t.status} type="transfer" />
                    <ArrowRight size={14} style={{ color: '#d1d5db' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
