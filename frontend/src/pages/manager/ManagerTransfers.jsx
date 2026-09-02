import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useManagerStore } from '@/store/managerStore'
import { ArrowLeftRight, Eye, Edit3, Trash2, X, Download } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import { exportToCsv } from '@/lib/exportUtils'
import StatusBadge from '@/components/manager/StatusBadge'
import AgentAvatar from '@/components/manager/AgentAvatar'
import TableSkeleton from '@/components/manager/TableSkeleton'
import EmptyState from '@/components/manager/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toastContext'
import { formatOwnerName } from '@/lib/format'

const STATUS_OPTIONS = ['pending', 'completed', 'failed', 'chasing', 'cotInProgress', 'hold']

export default function ManagerTransfers() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { transfers, agents, loadTransfers, loadAgents, isLoading, deleteTransfer } = useManagerStore()
  const [agentFilter, setAgentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('managerSelectedMonth') || localStorage.getItem('adminSelectedMonth')
    if (saved) return saved
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    localStorage.setItem('managerSelectedMonth', selectedMonth)
  }, [selectedMonth])

  const monthsList = useMemo(() => {
    const list = []
    const d = new Date()
    for (let i = 0; i < 12; i++) {
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      const value = `${year}-${String(month).padStart(2, '0')}`
      list.push({ value, label, year, month })
      d.setMonth(d.getMonth() - 1)
    }
    list.push({ value: 'all', label: 'All Time', year: null, month: null })
    return list
  }, [])

  useEffect(() => { loadTransfers({ limit: 500 }); loadAgents() }, [loadTransfers, loadAgents])

  const monthFilteredTransfers = useMemo(() => {
    if (selectedMonth === 'all') return transfers
    const [y, m] = selectedMonth.split('-').map(Number)
    return transfers.filter(t => {
      const d = new Date(t.createdAt)
      return d.getFullYear() === y && (d.getMonth() + 1) === m
    })
  }, [transfers, selectedMonth])

  const counts = useMemo(() => ({
    pending: monthFilteredTransfers.filter(t => t.status === 'pending').length,
    completed: monthFilteredTransfers.filter(t => t.status === 'completed').length,
    failed: monthFilteredTransfers.filter(t => t.status === 'failed').length,
    chasing: monthFilteredTransfers.filter(t => t.status === 'chasing').length,
    cotInProgress: monthFilteredTransfers.filter(t => t.status === 'cotInProgress').length,
    hold: monthFilteredTransfers.filter(t => t.status === 'hold').length,
  }), [monthFilteredTransfers])

  const agentMap = useMemo(() => {
    const map = {}
    agents.forEach(a => { map[a.id] = a })
    return map
  }, [agents])

  const filtered = useMemo(() => {
    return monthFilteredTransfers.filter(t => {
      if (agentFilter && t.employeeId !== Number(agentFilter)) return false
      if (statusFilter && t.status !== statusFilter) return false
      return true
    })
  }, [monthFilteredTransfers, agentFilter, statusFilter])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await deleteTransfer(deleteId)
      toast('Transfer deleted', 'success')
      setDeleteId(null)
    } catch {
      toast('Failed to delete transfer', 'error')
    }
  }, [deleteId, deleteTransfer, toast])

  const columns = useMemo(() => [
    {
      header: 'Business',
      width: '240px',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate max-w-[220px]" title={row.customer?.businessName || ''}>
            {row.customer?.businessName || 'N/A'}
          </p>
          <p className="text-xs text-slate-500 truncate max-w-[220px]">{formatOwnerName(row.customer?.ownerName || '')}</p>
        </div>
      ),
    },
    { 
      header: 'Agent', 
      width: '135px',
      cell: (row) => {
        const raw = agentMap[row.employeeId]?.name || 'Unknown'
        return <AgentAvatar name={raw.charAt(0).toUpperCase() + raw.slice(1)} size={26} showName />
      }
    },
    { 
      header: 'Utility & Supplier', 
      width: '210px',
      cell: (row) => (
        <span className="text-slate-700 text-[0.78rem] truncate max-w-[190px] inline-block capitalize">
          {row.utilityType ? `${row.utilityType}${row.supplier ? ` - ${row.supplier}` : ''}` : row.supplier || 'N/A'}
        </span>
      )
    },
    {
      header: 'Account',
      width: '110px',
      cell: (row) => (
        <span className="text-sm font-mono text-slate-600">{row.accountNumber || '-'}</span>
      ),
    },
    { 
      header: 'Date', 
      width: '90px',
      cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : 'N/A' 
    },
    { 
      header: 'Status', 
      width: '110px',
      cell: (row) => <StatusBadge status={row.status} type="transfer" /> 
    },
    {
      header: 'Actions',
      width: '105px',
      cell: (row) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => navigate(`/manager/transfers/${row.id}`)}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-blue-50 hover:text-blue-500 transition-colors" title="View">
            <Eye size={14} />
          </button>
          <button onClick={() => navigate(`/transfers/${row.id}/edit`)}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-indigo-50 hover:text-indigo-500 transition-colors" title="Edit">
            <Edit3 size={14} />
          </button>
          <button onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [navigate, agentMap])

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <PageHeader icon={ArrowLeftRight} iconBg="#f0fdf4" iconColor="#22c55e" title="All Transfers" subtitle={`${filtered.length} transfer${filtered.length !== 1 ? 's' : ''} across your team`} />

          <div className="flex gap-3 mb-5 flex-wrap items-center">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filter by:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none cursor-pointer shadow-sm"
              style={{ minWidth: '150px' }}
            >
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value) }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none cursor-pointer capitalize shadow-sm"
              style={{ minWidth: '140px' }}>
              <option value="">All Agents</option>
              {agents.map(a => <option key={a.id} value={a.id} className="capitalize">{a.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value) }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none cursor-pointer shadow-sm"
              style={{ minWidth: '155px' }}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s === 'cotInProgress' ? 'COT In Progress' : s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] || 0})
                </option>
              ))}
            </select>
            {(agentFilter || statusFilter) && (
              <button onClick={() => { setAgentFilter(''); setStatusFilter('') }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-500 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                <X size={12} /> Clear
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const exportData = filtered.map(t => ({
                  ID: t.id,
                  BusinessName: t.customer?.businessName || 'N/A',
                  OwnerName: t.customer?.ownerName || 'N/A',
                  Phone: t.customer?.businessPhone || 'N/A',
                  Postcode: t.customer?.postcode || 'N/A',
                  Agent: agentMap[t.employeeId]?.name || 'N/A',
                  UtilityType: t.utilityType || 'N/A',
                  Supplier: t.supplier || 'N/A',
                  Status: t.status || 'N/A',
                  Date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : 'N/A'
                }))
                exportToCsv(exportData, `Transfers_Export_${selectedMonth}`)
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm sm:ml-auto"
              title="Export Transfers to CSV"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {isLoading && transfers.length === 0 ? <TableSkeleton /> : filtered.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No transfers found" description="Try adjusting your filters" />
          ) : (
            <div className="rt-card">
              <div className="rt-card-body" style={{ padding: 0 }}>
                <DataTable columns={columns} data={filtered} onRowClick={(row) => navigate(`/manager/transfers/${row.id}`)} pageSize={10}
                  searchKey={(row) => `${row.id} ${row.customer?.businessName || ''} ${row.customer?.ownerName || ''} ${row.supplier || ''} ${row.utilityType || ''} ${row.accountNumber || ''}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm w-full">
          <DialogClose onClose={() => setDeleteId(null)} />
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
              <Trash2 size={22} color="#ef4444" />
            </div>
            <DialogTitle className="text-lg text-center">Delete Transfer?</DialogTitle>
            <DialogDescription className="text-center text-slate-500">
              This action cannot be undone. All associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
