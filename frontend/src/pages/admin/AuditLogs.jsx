import { useState, useEffect, useCallback } from 'react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import { ShieldCheck, Search, Filter, RefreshCw, Download, ArrowRight, User, Clock, Globe } from 'lucide-react'
import { exportToCsv } from '@/lib/exportUtils'

const ACTION_COLORS = {
  created: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  updated: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  deleted: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  soft_deleted: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  restored: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  approved: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  password_reset: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
  email: { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' },
  backup: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd' },
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [page, setPage] = useState(0)
  const limit = 30

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        skip: page * limit,
        limit,
      }
      if (actionFilter) params.action = actionFilter
      if (resourceFilter) params.resource = resourceFilter

      const res = await api.get(endpoints.admin.activityLogs, { params })
      setLogs(res.data?.items || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      console.error('Failed to fetch activity logs:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, actionFilter, resourceFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filteredLogs = logs.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (l.userName && l.userName.toLowerCase().includes(q)) ||
      (l.userEmail && l.userEmail.toLowerCase().includes(q)) ||
      (l.details && l.details.toLowerCase().includes(q)) ||
      (l.resource && l.resource.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q))
    )
  })

  const handleExport = () => {
    const exportData = filteredLogs.map((l) => ({
      ID: l.id,
      Timestamp: l.createdAt ? new Date(l.createdAt).toLocaleString() : 'N/A',
      ActorName: l.userName,
      ActorRole: l.userRole,
      ActorEmail: l.userEmail,
      Action: l.action,
      Resource: l.resource,
      ResourceID: l.resourceId || 'N/A',
      Details: l.details || 'N/A',
      IPAddress: l.ipAddress || 'N/A',
    }))
    exportToCsv(exportData, `Audit_Logs_Export_${new Date().toISOString().split('T')[0]}`)
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  System Audit Logs
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Track who created, modified, or deleted records across the organization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
              >
                <Download size={14} /> Export Logs
              </button>
              <button
                type="button"
                onClick={fetchLogs}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-sm border-0"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 shadow-sm mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by actor, details, or resource..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer shadow-sm"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="soft_deleted">Soft Deleted</option>
              <option value="restored">Restored</option>
              <option value="approved">Approved</option>
              <option value="password_reset">Password Reset</option>
              <option value="email">Emailed</option>
            </select>

            <select
              value={resourceFilter}
              onChange={(e) => { setResourceFilter(e.target.value); setPage(0) }}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer shadow-sm"
            >
              <option value="">All Resources</option>
              <option value="customer">Customer</option>
              <option value="sale">Sale</option>
              <option value="transfer">Transfer</option>
              <option value="callback">Callback</option>
              <option value="user">User / Staff</option>
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
              <option value="attendance">Attendance</option>
              <option value="salary_slip">Salary Slip</option>
            </select>
          </div>

          {/* Logs Table */}
          <div className="rt-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Resource</th>
                    <th className="py-3.5 px-4">Details / Summary</th>
                    <th className="py-3.5 px-4 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          Loading audit trail...
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No activity logs matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const color = ACTION_COLORS[log.action] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Timestamp */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>

                          {/* Actor */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-700 shrink-0">
                                {log.userName ? log.userName.charAt(0).toUpperCase() : <User size={12} />}
                              </div>
                              <div className="truncate max-w-[150px]">
                                <p className="font-bold text-slate-900 truncate leading-tight">
                                  {log.userName}
                                </p>
                                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                                  {log.userRole}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="py-3 px-4">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                              style={{ background: color.bg, color: color.text, borderColor: color.border }}
                            >
                              {log.action}
                            </span>
                          </td>

                          {/* Resource */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {log.resource} {log.resourceId ? `#${log.resourceId}` : ''}
                            </span>
                          </td>

                          {/* Details */}
                          <td className="py-3 px-4 text-slate-600 max-w-[340px] truncate" title={log.details || ''}>
                            {log.details || '-'}
                          </td>

                          {/* IP Address */}
                          <td className="py-3 px-4 text-right whitespace-nowrap text-slate-400 font-mono text-[10px]">
                            {log.ipAddress ? (
                              <span className="inline-flex items-center gap-1">
                                <Globe size={11} className="text-slate-300" />
                                {log.ipAddress}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50/50">
              <span>
                Showing {filteredLogs.length} of {total} total events
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span>Page {page + 1}</span>
                <button
                  type="button"
                  disabled={(page + 1) * limit >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
