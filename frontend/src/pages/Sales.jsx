import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import DataTable from '@/components/shared/DataTable'
import StatusBadge from '@/components/shared/StatusBadge'
import { Plus, PoundSterling, Loader2 } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'

const formatCamel = (str) => {
  if (!str) return ''
  const clean = str.replace(/bankRansfer/i, 'bankTransfer').replace(/(?<!t)rans/i, 'trans')
  return clean.replace(new RegExp('([A-Z])', 'g'), ' ').trim()
}

const H1_STYLE = { fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'chasing', label: 'Chasing' },
  { key: 'cotInProgress', label: 'COT In Progress' },
  { key: 'cotComplete', label: 'COT Complete' },
  { key: 'done', label: 'Sale Complete' },
]

export default function Sales() {
  const { sales, isLoading } = useDataStore()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')

  const counts = useMemo(() => ({
    all: sales.length,
    chasing: sales.filter((s) => s.cotStatus === 'chasing').length,
    cotInProgress: sales.filter((s) => s.cotStatus === 'cotInProgress').length,
    cotComplete: sales.filter((s) => s.cotStatus === 'cotComplete').length,
    done: sales.filter((s) => s.cotStatus === 'done').length,
  }), [sales])

  const filteredSales = useMemo(() => {
    if (activeFilter === 'all') return sales
    return sales.filter((s) => s.cotStatus === activeFilter)
  }, [sales, activeFilter])

  const columns = useMemo(() => [
    {
      header: 'Business',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{row.customer?.businessName || row.ownerFullName || 'N/A'}</p>
          <p className="text-xs text-gray-500 truncate">{row.ownerFullName || row.customer?.ownerName}</p>
        </div>
      ),
    },
    { header: 'Owner', cell: (row) => <span className="text-sm text-gray-700">{row.ownerFullName || '-'}</span> },
    { header: 'Status', cell: (row) => <StatusBadge status={row.cotStatus} type="sale" /> },
    {
      header: 'Type', cell: (row) => {
        const label = row.saleType === 'cot' ? 'COT' : row.saleType === 'renewal' ? 'Renewal' : row.saleType === 'out_of_contract' ? 'OOC' : '-'
        return <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{label}</span>
      },
    },
    {
      header: 'Business Type',
      cell: (row) => <span className="text-sm text-gray-600 capitalize">{formatCamel(row.businessType) || '-'}</span>,
    },
    {
      header: 'Payment',
      cell: (row) => <span className="text-sm text-gray-600 capitalize">{formatCamel(row.paymentMethod) || '-'}</span>,
    },
    {
      header: 'Created',
      cell: (row) => <span className="text-sm text-gray-500">{new Date(row.createdAt || Date.now()).toLocaleDateString('en-GB')}</span>,
    },
  ], []);

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{maxWidth:'960px', margin:'0 auto'}}>

          <div className="rt-fade" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <div className="rt-card-icon" style={{background:'#dcfce7'}}>
                <PoundSterling size={20} color="#22c55e" />
              </div>
              <div>
                <h1 style={H1_STYLE}>Sales</h1>
                <p style={{fontSize:'13px',color:'#64748b',margin:'3px 0 0',fontFamily:'DM Sans, sans-serif'}}>Manage sales applications</p>
              </div>
            </div>
            <button onClick={() => navigate(`/sales/apply`)} className="rt-btn-primary" style={{flex:'none',padding:'11px 22px',fontSize:14}}>
              <Plus size={16}/> New Sale Application
            </button>
          </div>

          <div className="rt-fade rt-d1" style={{marginBottom:20}}>
            <div className="rt-toggle-row" style={{display:'inline-flex',flexWrap:'wrap',padding:4}}>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    padding:'6px 16px', borderRadius:16, border:'none',
                    fontSize:13, fontWeight:600, cursor:'pointer',
                    fontFamily:'DM Sans, sans-serif',
                    transition:'all .2s',
                    background: activeFilter === f.key
                      ? 'linear-gradient(135deg,#6366f1,#7c3aed)'
                      : 'transparent',
                    color: activeFilter === f.key ? '#fff' : '#64748b',
                    boxShadow: activeFilter === f.key
                      ? '0 2px 8px rgba(99,102,241,0.3)'
                      : 'none',
                  }}
                >
                  {f.label}{' '}<span style={{opacity:0.7}}>({counts[f.key]})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rt-card rt-fade rt-d2">
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <span className="rt-card-title">
                  {activeFilter === 'all' ? 'All' : FILTERS.find((f) => f.key === activeFilter)?.label} Sales
                </span>
              </div>
              <span style={{color:'#94a3b8',fontWeight:600,fontSize:12,letterSpacing:'0.4px'}}>
                ({filteredSales.length})
              </span>
            </div>
            <div className="rt-card-body">
              {isLoading && !sales.length ? (
                <div style={{display:'flex',justifyContent:'center',padding:'48px 0'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                    <Loader2 size={24} color="#6366f1" className="rt-spin" />
                    <span style={{fontSize:13,color:'#94a3b8',fontWeight:600}}>Loading sales...</span>
                  </div>
                </div>
              ) : filteredSales.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px 20px'}}>
                  <PoundSterling size={40} color="#cbd5e1" style={{marginBottom:8}} />
                  <p style={{fontSize:15,fontWeight:700,color:'#64748b',margin:0}}>No sales found</p>
                  <p style={{fontSize:13,color:'#94a3b8',marginTop:4}}>
                    {activeFilter !== 'all' ? 'No sales match the selected filter.' : 'Create your first sale application to get started.'}
                  </p>
                </div>
              ) : (
                <DataTable columns={columns} data={filteredSales} searchKey={(r) => r.customer?.businessName || r.ownerFullName || ''} onRowClick={(row) => navigate(`/sales/${row.id}`)} />
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
