import { useEffect, useState, useMemo, useCallback } from 'react'
import { useManagerStore } from '@/store/managerStore'
import { PoundSterling, X, Eye, Trash2 } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { useNavigate } from 'react-router-dom'
import { formatOwnerName } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toastContext'

const ITEMS_PER_PAGE = 10

const formatCamel = (str) => {
  if (!str) return ''
  const clean = str.replace(/bankRansfer/i, 'bankTransfer').replace(/(?<!t)rans/i, 'trans')
  return clean.replace(/([A-Z])/g, ' $1').trim()
}

const STATUS_OPTIONS = [
  { value: 'chasing', label: 'Chasing' },
  { value: 'cotInProgress', label: 'COT In Progress' },
  { value: 'cotComplete', label: 'COT Complete' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'outOfContract', label: 'Out of Contract' },
  { value: 'done', label: 'Sale Complete' },
  { value: 'hold', label: 'On Hold' },
]

export default function ManagerSales() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { sales, agents, loadSales, loadAgents, isLoading, deleteSale } = useManagerStore()
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { loadSales({ limit: 500 }); loadAgents() }, [loadSales, loadAgents])

  const agentMap = useMemo(() => {
    const map = {}
    agents.forEach(a => { map[a.id] = a })
    return map
  }, [agents])

  const counts = useMemo(() => ({
    chasing: sales.filter(s => s.cotStatus === 'chasing').length,
    cotInProgress: sales.filter(s => s.cotStatus === 'cotInProgress').length,
    cotComplete: sales.filter(s => s.cotStatus === 'cotComplete').length,
    done: sales.filter(s => s.cotStatus === 'done').length,
    hold: sales.filter(s => s.cotStatus === 'hold').length,
  }), [sales])

  const filtered = useMemo(() => {
    return sales.filter(s => {
      if (agentFilter && s.employeeId !== Number(agentFilter)) return false
      if (statusFilter && s.cotStatus !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const matchId = String(s.id).includes(q)
        const matchBusiness = (s.customer?.businessName || '').toLowerCase().includes(q)
        const matchOwner = (s.ownerFullName || s.customer?.ownerName || '').toLowerCase().includes(q)
        const matchAgent = (agentMap[s.employeeId]?.name || '').toLowerCase().includes(q)
        if (!matchId && !matchBusiness && !matchOwner && !matchAgent) return false
      }
      return true
    })
  }, [sales, agentFilter, statusFilter, search, agentMap])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await deleteSale(deleteId)
      toast('Sale deleted', 'success')
      setDeleteId(null)
    } catch {
      toast('Failed to delete sale', 'error')
    }
  }, [deleteId, deleteSale, toast])

  const columns = useMemo(() => [
    {
      header: 'ID',
      width: '60px',
      cell: (row) => <span className="font-semibold text-slate-900">#{row.id}</span>
    },
    {
      header: 'Business',
      width: '200px',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate max-w-[180px]" title={row.customer?.businessName || ''}>
            {row.customer?.businessName || 'N/A'}
          </p>
          <p className="text-xs text-slate-500 truncate max-w-[180px]" title={formatOwnerName(row.ownerFullName || row.customer?.ownerName || '')}>
            {formatOwnerName(row.ownerFullName || row.customer?.ownerName || '')}
          </p>
        </div>
      ),
    },
    {
      header: 'Agent',
      width: '130px',
      cell: (row) => {
        const name = agentMap[row.employeeId]?.name || 'Unknown'
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              {name[0].toUpperCase()}
            </div>
            <span className="text-sm text-slate-700 capitalize" style={{ textTransform: 'capitalize' }}>{name}</span>
          </div>
        )
      }
    },
    {
      header: 'Status',
      width: '110px',
      cell: (row) => <StatusBadge status={row.cotStatus} type="sale" />
    },
    {
      header: 'Type',
      width: '60px',
      cell: (row) => {
        const label = row.saleType === 'cot' ? 'COT' : row.saleType === 'renewal' ? 'Ren' : row.saleType === 'out_of_contract' ? 'OOC' : '-'
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{label}</span>
      },
    },
    {
      header: 'Business Type',
      width: '110px',
      cell: (row) => <span className="text-sm text-slate-600 capitalize">{formatCamel(row.businessType) || '-'}</span>,
    },
    {
      header: 'Payment',
      width: '110px',
      cell: (row) => <span className="text-sm text-slate-600 capitalize">{formatCamel(row.paymentMethod) || '-'}</span>,
    },
    {
      header: 'Created',
      width: '95px',
      cell: (row) => row.createdAt
        ? new Date(row.createdAt).toLocaleDateString('en-GB')
        : 'N/A'
    },
    {
      header: 'Actions',
      width: '90px',
      cell: (row) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => navigate(`/sales/${row.id}`)}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-blue-50 hover:text-blue-500 transition-colors" title="View">
            <Eye size={14} />
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
          <PageHeader
            icon={PoundSterling}
            iconBg="#fffbeb"
            iconColor="#f59e0b"
            title="All Sales"
            subtitle={`${filtered.length} sale${filtered.length !== 1 ? 's' : ''} across your team`}
          />

          <div className="flex gap-3 mb-5 flex-wrap items-center">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-slate-200 flex-1 min-w-[200px] max-w-[300px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                placeholder="Search by ID, business, owner or agent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-none outline-none flex-1 text-sm bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500 border-0 bg-transparent cursor-pointer text-lg leading-none">×</button>
              )}
            </div>

            {/* Agent filter */}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none cursor-pointer capitalize shadow-sm"
              style={{ minWidth: '140px', textTransform: 'capitalize' }}
            >
              <option value="">All Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id} className="capitalize" style={{ textTransform: 'capitalize' }}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none cursor-pointer shadow-sm"
              style={{ minWidth: '155px' }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label} ({counts[s.value] || 0})
                </option>
              ))}
            </select>

            {(agentFilter || statusFilter || search) && (
              <button
                onClick={() => { setSearch(''); setAgentFilter(''); setStatusFilter('') }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-500 bg-white cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {isLoading && sales.length === 0 ? (
            <LoadingSpinner size={32} text="Loading sales..." />
          ) : filtered.length === 0 ? (
            <EmptyState icon={PoundSterling} title="No sales found" description="Try adjusting your filters" />
          ) : (
            <div className="rt-card">
              <div className="rt-card-body" style={{ padding: 0 }}>
                <DataTable
                  columns={columns}
                  data={filtered}
                  onRowClick={(row) => navigate(`/sales/${row.id}`)}
                  pageSize={ITEMS_PER_PAGE}
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
            <DialogTitle className="text-lg text-center">Delete Sale?</DialogTitle>
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
