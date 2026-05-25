import { APP_STYLES } from '@/lib/styles'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useLoadingToast } from '@/hooks/useLoadingToast'
import { ArrowLeft, Plus, ArrowLeftRight, Loader2, Trash2, Eye, Edit3 } from 'lucide-react'
import { formatOwnerName } from '@/lib/format'

function Card({ icon: Icon, title, headerRight, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay||''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon">
            <Icon size={16} />
          </div>
          <span className="rt-card-title">{title}</span>
        </div>
        {headerRight}
      </div>
      <div className="rt-card-body">{children}</div>
    </div>
  )
}

export default function Transfers() {
  const { transfers, isLoading, deleteTransfer } = useDataStore()
  const navigate = useNavigate()
  const withToast = useLoadingToast()
  const [deleteId, setDeleteId] = useState(null)

  const columns = useMemo(() => [
    {
      header: 'Business',
      width: '240px',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{row.customer?.businessName || 'N/A'}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{formatOwnerName(row.customer?.ownerName || '')}</p>
        </div>
      ),
    },
    {
      header: 'Utility',
      width: '100px',
      cell: (row) => <span className="text-xs font-medium text-gray-600 capitalize">{row.customer?.utilityType || 'N/A'}</span>,
    },
    {
      header: 'Status',
      width: '110px',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Account',
      width: '120px',
      cell: (row) => (
        <span className="text-sm font-mono text-gray-700">{row.accountNumber || '-'}</span>
      ),
    },
    {
      header: 'Created',
      width: '110px',
      cell: (row) => (
        <span className="text-sm text-gray-500">{new Date(row.createdAt || Date.now()).toLocaleDateString('en-GB')}</span>
      ),
    },
    {
      header: 'Actions',
      width: '130px',
      cell: (row) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => navigate('/transfers/' + row.id)}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-blue-50 hover:text-blue-500 transition-colors" title="View">
            <Eye size={14} />
          </button>
          <button onClick={() => navigate('/transfers/' + row.id + '/edit')}
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
  ], [navigate])

  const handleDelete = () => {
    if (!deleteId) return
    withToast(
      async () => { await deleteTransfer(deleteId); setDeleteId(null) },
      { loading: 'Deleting...', success: 'Transfer deleted', error: 'Failed to delete' },
    )
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{maxWidth:'960px', margin:'0 auto'}}>

          {/* -- Header -- */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <button className="rt-back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={17}/>
              </button>
              <div>
                <h1 style={{fontSize:'22px',fontWeight:800,color:'#0f172a',letterSpacing:'-0.5px',margin:0}}>
                  Transfers
                </h1>
                <p style={{fontSize:'13px',color:'#64748b',margin:'3px 0 0',fontFamily:"'DM Sans',sans-serif"}}>
                  Manage all transfer requests
                </p>
              </div>
            </div>
            <button
              className="rt-btn-primary"
              style={{flex:'none',padding:'11px 22px',fontSize:'14px'}}
              onClick={() => navigate('/transfers/add')}
            >
              <Plus size={16}/> Add Transfer
            </button>
          </div>

          {/* -- Transfers Table -- */}
          <Card
            icon={ArrowLeftRight}
            title="All Transfers"
            delay="rt-d1"
            headerRight={<span style={{color:'#94a3b8',fontWeight:600,fontSize:'12px',letterSpacing:'0.4px'}}>({transfers.length} total)</span>}
          >
            {isLoading && !transfers.length ? (
              <div style={{display:'flex',justifyContent:'center',padding:'48px 0'}}>
                <Loader2 size={24} className="rt-spin" color="#6366f1" />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={transfers}
                searchKey={(r) => r.customer?.businessName || r.customer?.ownerName || ''}
                onRowClick={(row) => navigate('/transfers/' + row.id)}
              />
            )}
          </Card>

          {/* -- Delete Dialog -- */}
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
        </div>
      </div>
    </>
  )
}
