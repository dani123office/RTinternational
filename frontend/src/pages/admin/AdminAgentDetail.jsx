import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import {
  ArrowLeft, User, ArrowLeftRight, PoundSterling,
  TrendingUp, Mail, Calendar,
} from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function StatusBadge({ status, type }) {
  const colors = {
    pending: { bg: '#fffbeb', text: '#d97706' },
    completed: { bg: '#f0fdf4', text: '#16a34a' },
    done: { bg: '#f0fdf4', text: '#16a34a' },
    chasing: { bg: '#eef2ff', text: '#6366f1' },
    failed: { bg: '#fef2f2', text: '#dc2626' },
    overdue: { bg: '#fef2f2', text: '#dc2626' },
    cotInProgress: { bg: '#f5f3ff', text: '#8b5cf6' },
    submitted: { bg: '#eef2ff', text: '#6366f1' },
    hold: { bg: '#f1f5f9', text: '#64748b' },
  }
  const c = colors[status] || { bg: '#f1f5f9', text: '#64748b' }
  const statusKey = (status || '').toLowerCase()
  let label = status?.replace(/([A-Z])/g, ' $1').trim() || 'N/A'
  if (statusKey === 'done' || statusKey === 'completed') {
    if (type === 'callback') {
      label = 'Callback Complete'
    } else if (type === 'transfer') {
      label = 'Transfer Complete'
    } else if (type === 'sale') {
      label = 'Sale Complete'
    }
  }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', background: c.bg, color: c.text,
      fontWeight: 600, fontSize: '0.72rem', textTransform: 'capitalize',
    }}>
      {label}
    </span>
  )
}

const tabs = ['Callbacks', 'Transfers', 'Sales']

export default function AdminAgentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedAgent, loadAdminAgentDetail, isLoading, error } = useAdminStore()

  const [activeTab, setActiveTab] = useState('Transfers')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { if (id) loadAdminAgentDetail(Number(id)) }, [id, loadAdminAgentDetail])

  const agent     = selectedAgent?.agent
  const stats     = selectedAgent?.stats
  const callbacks = selectedAgent?.callbacks || []
  const transfers = selectedAgent?.transfers || []
  const sales     = selectedAgent?.sales || []

  const activeItems = activeTab === 'Callbacks' ? callbacks : activeTab === 'Transfers' ? transfers : sales

  const filteredData = useMemo(() => {
    if (!statusFilter) return activeItems
    return activeItems.filter(item => (item.status || item.cotStatus) === statusFilter)
  }, [activeItems, statusFilter])

  if (isLoading && !selectedAgent) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page"><LoadingSpinner size={32} text="Loading agent details..." /></div>
      </>
    )
  }

  if (!agent) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="rt-card p-10 text-center">
            <p className="text-slate-400 text-sm">{error || 'Agent not found.'}</p>
            <Link to="/admin/agents" className="mt-4 text-indigo-600 text-sm font-medium inline-block">← Back to Agents</Link>
          </div>
        </div>
      </>
    )
  }

  const isCallbacks = activeTab === 'Callbacks'
  const isTransfers = activeTab === 'Transfers'

  const tableColumns = [
    { header: 'ID', cell: (row) => <span className="font-semibold text-slate-800">#{row.id}</span> },
    {
      header: 'Business Name',
      cell: (row) => (
        <span className="font-semibold text-slate-900 truncate max-w-[160px] inline-block" title={row.customer?.businessName || row.customer?.ownerName || 'N/A'}>
          {row.customer?.businessName || row.customer?.ownerName || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Owner',
      cell: (row) => (
        <span className="text-slate-500 text-[0.78rem] truncate max-w-[120px] inline-block" title={row.customer?.ownerName || '-'}>
          {row.customer?.ownerName || '-'}
        </span>
      ),
    },
    {
      header: isCallbacks ? 'Scheduled' : isTransfers ? 'Supplier' : 'Payment',
      cell: (row) => {
        if (isCallbacks) {
          const d = row.scheduledDateTime || row.scheduledDate
          return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '-'
        }
        const val = isTransfers ? row.supplier : row.paymentMethod
        return <span className="text-slate-700 text-[0.78rem]">{val || '-'}</span>
      },
    },
    { header: 'Date', cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : 'N/A' },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status || row.cotStatus} type={isCallbacks ? 'callback' : isTransfers ? 'transfer' : 'sale'} /> },
  ]

  const statusOptions = isCallbacks
    ? ['pending', 'done', 'not_interested']
    : isTransfers
      ? ['pending', 'completed', 'failed', 'chasing', 'cotInProgress', 'hold']
      : ['chasing', 'cotInProgress', 'done', 'hold']

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          <div className="rt-page-header">
            <Link to="/admin/agents" className="flex items-center gap-1.5 text-sm text-slate-500 no-underline hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} /> Back to Agents
            </Link>
          </div>

          <div className="rt-card rt-fade" style={{ marginBottom: '20px' }}>
            <div className="flex items-center gap-4 p-5" style={{ flexWrap: 'wrap' }}>
              <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
                <User size={22} color="white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 truncate" style={{ textTransform: 'capitalize' }}>{agent.name}</h2>
                <p className="text-sm text-slate-500 truncate flex items-center gap-1">
                  <Mail size={13} /> {agent.email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: agent.isActive ? '#d1fae5' : '#fee2e2', color: agent.isActive ? '#065f46' : '#991b1b' }}>
                  {agent.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 rt-fade rt-d1">
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                <Calendar size={18} color="#6366f1" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Callbacks</p>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.callbacks || 0}</p>
              </div>
            </div>
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <ArrowLeftRight size={18} color="#16a34a" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Transfers</p>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.transfers || 0}</p>
              </div>
            </div>
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                <PoundSterling size={18} color="#d97706" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sales</p>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.sales || 0}</p>
              </div>
            </div>
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f5f3ff' }}>
                <TrendingUp size={18} color="#8b5cf6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conversion</p>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.conversionRate || 0}%</p>
              </div>
            </div>
          </div>

          <div className="rt-card rt-fade">
            <div className="flex border-b gap-1 px-4" style={{ borderColor: '#f1f5f9' }}>
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="py-3 px-3 border-none bg-none cursor-pointer text-sm font-medium transition-all"
                  style={{
                    color: activeTab === tab ? '#6366f1' : '#94a3b8',
                    borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                  }}>
                  {tab}
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: activeTab === tab ? '#eef2ff' : '#f8fafc', color: activeTab === tab ? '#6366f1' : '#94a3b8' }}>
                    {tab === 'Callbacks' ? callbacks.length : tab === 'Transfers' ? transfers.length : sales.length}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm text-slate-500">
                  {activeItems.length} {activeTab.toLowerCase()}{activeItems.length !== 1 ? 's' : ''} total
                </p>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rt-input text-xs py-1.5 w-auto"
                >
                  <option value="">All Status</option>
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1).replace(/([A-Z])/g, ' $1')}
                    </option>
                  ))}
                </select>
              </div>

              {activeItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-sm">No {activeTab.toLowerCase()} found for this agent.</p>
                </div>
              ) : (
                <DataTable
                  columns={tableColumns}
                  data={filteredData}
                  pageSize={10}
                  searchKey={(row) => `${row.id} ${row.customer?.businessName || ''} ${row.customer?.ownerName || ''} ${row.ownerFullName || ''} ${row.supplier || ''}`}
                  onRowClick={(row) => {
                    if (activeTab === 'Callbacks') navigate(`/admin/callbacks/${row.id}`)
                    else if (activeTab === 'Transfers') navigate(`/admin/transfers/${row.id}`)
                    else navigate(`/admin/sales/${row.id}`)
                  }}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
