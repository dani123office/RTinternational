import { APP_STYLES } from '@/lib/styles'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import DataTable from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useLoadingToast } from '@/hooks/useLoadingToast'
import { Users, Loader2, Bolt, Flame, Gauge, Trash2, Eye, X } from 'lucide-react'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'not_interested', label: 'Not Interested' },
]

function Card({ icon: Icon, iconColor, iconBg, title, headerRight, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay || ''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon" style={{ background: iconBg || 'rgba(99,102,241,0.15)' }}>
            <Icon size={16} color={iconColor || '#6366f1'} />
          </div>
          <span className="rt-card-title">{title}</span>
        </div>
        {headerRight}
      </div>
      <div className="rt-card-body">{children}</div>
    </div>
  )
}

export default function Customers() {
  const { customers, callbacks, transfers, isLoading, deleteCustomer } = useDataStore()
  const navigate = useNavigate()
  const withToast = useLoadingToast()
  const [deleteId, setDeleteId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  const notInterestedCustomerIds = useMemo(() => {
    const ids = new Set()
    callbacks.forEach((cb) => {
      if (cb.status === 'not_interested') ids.add(cb.customerId)
    })
    transfers.forEach((t) => {
      if (t.status === 'not_interested') ids.add(t.customerId)
    })
    return ids
  }, [callbacks, transfers])

  const filteredCustomers = useMemo(() => {
    if (activeFilter === 'not_interested') {
      return customers.filter((c) => notInterestedCustomerIds.has(c.id))
    }
    return customers
  }, [customers, activeFilter, notInterestedCustomerIds])

  const columns = useMemo(() => [
    {
      header: 'Business',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{row.businessName || 'N/A'}</p>
          <p className="text-xs text-gray-500 truncate">{row.ownerName}</p>
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-sm truncate">{row.businessPhone || row.ownerPhone || '-'}</p>
          {row.email && <p className="text-xs text-gray-500 truncate">{row.email}</p>}
        </div>
      ),
    },
    {
      header: 'Utility',
      cell: (row) => {
        const Icon = row.utilityType === 'gas' ? Flame : row.utilityType === 'both' ? Gauge : Bolt
        const color = row.utilityType === 'gas' ? '#3b82f6' : row.utilityType === 'both' ? '#8b5cf6' : '#f59e0b'
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize px-2.5 py-1 rounded-full bg-white border" style={{ color, borderColor: color + '30' }}>
            <Icon size={13} color={color} /> {row.utilityType}
          </span>
        )
      },
    },
    {
      header: 'Status',
      cell: (row) => {
        const isNI = notInterestedCustomerIds.has(row.id)
        return isNI ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
            <X size={11} /> Not Interested
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )
      },
    },
    {
      header: 'Meters',
      cell: (row) => (
        <span className="text-sm text-gray-700">
          {row.electricityMeters?.length ? `${row.electricityMeters.length} Elec` : ''}
          {row.electricityMeters?.length && row.gasMeters?.length ? ', ' : ''}
          {row.gasMeters?.length ? `${row.gasMeters.length} Gas` : ''}
          {!row.electricityMeters?.length && !row.gasMeters?.length ? <span className="text-gray-400">-</span> : ''}
        </span>
      ),
    },
    {
      header: 'Created',
      cell: (row) => <span className="text-sm text-gray-500">{new Date(row.createdAt || Date.now()).toLocaleDateString('en-GB')}</span>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); navigate('/customers/' + row.id) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border border-gray-200 bg-white text-indigo-500 shadow-sm transition-all duration-200 hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0">
            <Eye size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(row.id) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border border-red-200 bg-red-50 text-red-500 shadow-sm transition-all duration-200 hover:bg-red-100 hover:border-red-300 hover:shadow-red-100 hover:-translate-y-0.5 active:translate-y-0">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ], [navigate, notInterestedCustomerIds])

  const handleDelete = () => {
    if (!deleteId) return
    withToast(async () => { await deleteCustomer(deleteId); setDeleteId(null) }, { loading: 'Deleting...', success: 'Customer deleted', error: 'Failed to delete' })
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Customers</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0', fontFamily: "'DM Sans',sans-serif" }}>
                Browse and manage all customer accounts
              </p>
            </div>
          </div>

          <div className="rt-fade rt-d1" style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key
              const count = f.key === 'not_interested' ? notInterestedCustomerIds.size : customers.length
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className="rt-toggle-row"
                  style={{
                    cursor:'pointer',
                    background: isActive ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : '#f8fafc',
                    color: isActive ? '#fff' : '#64748b',
                    borderColor: isActive ? 'transparent' : '#e2e6ec',
                    fontWeight:600,
                    fontSize:'12px',
                    textTransform:'uppercase',
                    letterSpacing:'.4px',
                    transition:'all .2s',
                  }}
                >
                  {f.label}
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.1)',
                    color: isActive ? '#fff' : '#6366f1',
                    padding:'1px 7px',
                    borderRadius:'10px',
                    fontSize:'11px',
                    fontWeight:700,
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <Card icon={Users} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title={activeFilter === 'not_interested' ? 'Not Interested' : 'All Customers'} delay="rt-d2"
            headerRight={<span className="text-gray-400 font-medium text-xs bg-gray-50 px-2.5 py-1 rounded-full">{filteredCustomers.length}</span>}>
            {isLoading && !customers.length ? (
              <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" color="#6366f1" /></div>
            ) : (
              <DataTable columns={columns} data={filteredCustomers} searchKey="businessName" onRowClick={(row) => navigate('/customers/' + row.id)} />
            )}
          </Card>

          <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
            <DialogContent className="max-w-sm w-full">
              <DialogClose onClose={() => setDeleteId(null)} />
              <DialogHeader>
                <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </div>
                <DialogTitle className="text-lg text-center">Delete Customer?</DialogTitle>
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
        </div>
      </div>
    </>
  )
}
