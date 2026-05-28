import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useManagerStore } from '@/store/managerStore'
import {
  ArrowLeft, PhoneCall, ArrowLeftRight, PoundSterling, User,
  TrendingUp, Plus, Edit3, Trash2, Eye, Download,
} from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import StatCard from '@/components/manager/StatCard'
import StatusBadge from '@/components/manager/StatusBadge'
import TableSkeleton from '@/components/manager/TableSkeleton'
import RecordModal from '@/components/manager/RecordModal'
import DataTable from '@/components/shared/DataTable'
import { useToast } from '@/components/ui/toastContext'

const tabs = ['Overview', 'Transfers', 'Sales']

const dayOptions = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
]

function getNextDate(dayName) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const target = days.indexOf(dayName)
  if (target === -1) return ''
  const today = new Date()
  const current = today.getDay()
  let diff = target - current
  if (diff <= 0) diff += 7
  const next = new Date(today)
  next.setDate(today.getDate() + diff)
  return next.toISOString().split('T')[0]
}

const activityConfig = {
  callback: { dot: '#6366f1', bg: '#eef2ff', Icon: PhoneCall },
  transfer: { dot: '#22c55e', bg: '#f0fdf4', Icon: ArrowLeftRight },
  sale:     { dot: '#f59e0b', bg: '#fffbeb', Icon: PoundSterling },
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="rt-label">{label}</label>
      {children}
    </div>
  )
}

export default function AgentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    selectedAgent, loadAgentDetail, isLoading, error,
    createCallback, createTransfer, createSale,
    updateCallback, updateTransfer, updateSale,
    deleteCallback, deleteTransfer, deleteSale,
  } = useManagerStore()

  const [activeTab, setActiveTab]         = useState('Overview')
  const [showCreateModal, setShowCreateModal] = useState(null)
  const [editItem, setEditItem]           = useState(null)
  const [formData, setFormData]           = useState({})
  const [saving, setSaving]               = useState(false)
  const [viewItem, setViewItem]           = useState(null)
  const [statusFilter, setStatusFilter]   = useState('')

  useEffect(() => { if (id) loadAgentDetail(Number(id)) }, [id, loadAgentDetail])

  const agent     = selectedAgent?.agent
  const stats     = selectedAgent?.stats
  const callbacks = selectedAgent?.callbacks || []
  const transfers = selectedAgent?.transfers || []
  const sales     = selectedAgent?.sales     || []

  const reload   = useCallback(() => loadAgentDetail(Number(id)), [id, loadAgentDetail])
  const upd      = (key, val) => setFormData(p => ({ ...p, [key]: val }))

  const resetForm = () => {
    setShowCreateModal(null)
    setEditItem(null)
    setFormData({})
    setSaving(false)
  }

  const buildPayload = (type) => {
    const base = { ...formData, employeeId: agent.id }
    if (type === 'callback' || type === 'transfer') {
      if (base.date && base.time) {
        base.scheduledDateTime = `${base.date}T${base.time}:00`
      }
      if (base.day) base.dayOfWeek = base.day
      delete base.date
      delete base.time
      delete base.day
    }
    return base
  }

  const handleCreate = async () => {
    if (showCreateModal === 'callback' && (!formData.date || !formData.time)) {
      toast('Please set date and time for the callback', 'error'); return
    }
    setSaving(true)
    try {
      const payload = buildPayload(showCreateModal)
      if (showCreateModal === 'callback')  await createCallback(payload)
      if (showCreateModal === 'transfer')  await createTransfer(payload)
      if (showCreateModal === 'sale')      await createSale(payload)
      toast(`${showCreateModal.charAt(0).toUpperCase() + showCreateModal.slice(1)} created successfully`, 'success')
      resetForm()
      reload()
    } catch (err) {
      toast(err?.response?.data?.detail || 'Failed to create record', 'error')
    } finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      const payload = buildPayload(showCreateModal)
      if (showCreateModal === 'callback') await updateCallback(editItem.id, payload)
      if (showCreateModal === 'transfer') await updateTransfer(editItem.id, payload)
      if (showCreateModal === 'sale')     await updateSale(editItem.id, payload)
      toast('Record updated successfully', 'success')
      resetForm()
      reload()
    } catch (err) {
      toast(err?.response?.data?.detail || 'Failed to update', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (type, itemId) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      if (type === 'callback') await deleteCallback(itemId)
      if (type === 'transfer') await deleteTransfer(itemId)
      if (type === 'sale')     await deleteSale(itemId)
      toast('Record deleted', 'success')
      reload()
    } catch {
      toast('Failed to delete', 'error')
    }
  }

  const handleDayChange = (day) => setFormData(p => ({ ...p, day, date: getNextDate(day) }))

  const renderForm = () => {
    if (showCreateModal === 'callback') return (
      <div className="flex flex-col gap-3">
        <FormField label="Day of Week">
          <select value={formData.day || ''} onChange={(e) => handleDayChange(e.target.value)} className="rt-input">
            <option value="">Select day</option>
            {dayOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date">
            <input type="date" value={formData.date || ''} onChange={(e) => upd('date', e.target.value)} className="rt-input" />
          </FormField>
          <FormField label="Time">
            <input type="time" value={formData.time || '10:00'} onChange={(e) => upd('time', e.target.value)} className="rt-input" />
          </FormField>
        </div>
        <FormField label="Status">
          <select value={formData.status || 'pending'} onChange={(e) => upd('status', e.target.value)} className="rt-input">
            <option value="pending">Pending</option>
            <option value="done">Done</option>
            <option value="failed">Failed</option>
            <option value="chasing">Chasing</option>
            <option value="overdue">Overdue</option>
          </select>
        </FormField>
        <FormField label="Notes">
          <textarea value={formData.notes || ''} onChange={(e) => upd('notes', e.target.value)} placeholder="Call notes..." className="rt-input" rows={3} />
        </FormField>
      </div>
    )

    if (showCreateModal === 'transfer') return (
      <div className="flex flex-col gap-3">
        <FormField label="Utility Type">
          <select value={formData.utilityType || ''} onChange={(e) => upd('utilityType', e.target.value)} className="rt-input">
            <option value="">Select...</option>
            <option value="electricity">Electricity</option>
            <option value="gas">Gas</option>
            <option value="both">Both</option>
          </select>
        </FormField>
        <FormField label="Supplier">
          <input type="text" value={formData.supplier || ''} onChange={(e) => upd('supplier', e.target.value)} placeholder="e.g. British Gas" className="rt-input" />
        </FormField>
        <FormField label="Status">
          <select value={formData.status || 'pending'} onChange={(e) => upd('status', e.target.value)} className="rt-input">
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="chasing">Chasing</option>
            <option value="cotInProgress">COT In Progress</option>
            <option value="hold">On Hold</option>
          </select>
        </FormField>
        <FormField label="Account Number">
          <input type="text" value={formData.accountNumber || ''} onChange={(e) => upd('accountNumber', e.target.value)} placeholder="e.g. AC12345678" className="rt-input" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="MPAN">
            <input type="text" value={formData.mpan || ''} onChange={(e) => upd('mpan', e.target.value)} placeholder="Electricity supply no." className="rt-input" />
          </FormField>
          <FormField label="MPRN">
            <input type="text" value={formData.mprn || ''} onChange={(e) => upd('mprn', e.target.value)} placeholder="Gas supply no." className="rt-input" />
          </FormField>
        </div>
        <FormField label="MSN (Meter Serial No.)">
          <input type="text" value={formData.msn || ''} onChange={(e) => upd('msn', e.target.value)} placeholder="e.g. 12A3456789" className="rt-input" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Day of Week">
            <select value={formData.day || ''} onChange={(e) => handleDayChange(e.target.value)} className="rt-input">
              <option value="">Select day</option>
              {dayOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </FormField>
          <FormField label="Date">
            <input type="date" value={formData.date || ''} onChange={(e) => upd('date', e.target.value)} className="rt-input" />
          </FormField>
        </div>
        <FormField label="Notes">
          <textarea value={formData.notes || ''} onChange={(e) => upd('notes', e.target.value)} placeholder="Transfer notes..." className="rt-input" rows={3} />
        </FormField>
      </div>
    )

    return (
      <div className="flex flex-col gap-3">
        <FormField label="Owner Full Name">
          <input type="text" value={formData.ownerFullName || ''} onChange={(e) => upd('ownerFullName', e.target.value)} placeholder="e.g. John Smith" className="rt-input" />
        </FormField>
        <FormField label="Home Address">
          <input type="text" value={formData.homeAddress || ''} onChange={(e) => upd('homeAddress', e.target.value)} placeholder="Full home address" className="rt-input" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date of Birth">
            <input type="date" value={formData.dateOfBirth || ''} onChange={(e) => upd('dateOfBirth', e.target.value)} className="rt-input" />
          </FormField>
          <FormField label="Business Type">
            <input type="text" value={formData.businessType || ''} onChange={(e) => upd('businessType', e.target.value)} placeholder="e.g. Retail" className="rt-input" />
          </FormField>
        </div>
        <FormField label="Status">
          <select value={formData.cotStatus || 'chasing'} onChange={(e) => upd('cotStatus', e.target.value)} className="rt-input">
            <option value="chasing">Chasing</option>
            <option value="cotInProgress">COT In Progress</option>
            <option value="done">Sale Complete</option>
            <option value="hold">On Hold</option>
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Bill Frequency">
            <select value={formData.billFrequency || ''} onChange={(e) => upd('billFrequency', e.target.value)} className="rt-input">
              <option value="">Select...</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </FormField>
          <FormField label="Payment Method">
            <select value={formData.paymentMethod || ''} onChange={(e) => upd('paymentMethod', e.target.value)} className="rt-input">
              <option value="">Select...</option>
              <option value="Direct Debit">Direct Debit</option>
              <option value="BACS">BACS</option>
            </select>
          </FormField>
        </div>
        <FormField label="Bank Name">
          <input type="text" value={formData.bankName || ''} onChange={(e) => upd('bankName', e.target.value)} placeholder="e.g. Lloyds" className="rt-input" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Sort Code">
            <input type="text" value={formData.sortCode || ''} onChange={(e) => upd('sortCode', e.target.value)} placeholder="12-34-56" className="rt-input" />
          </FormField>
          <FormField label="Account Number">
            <input type="text" value={formData.bankAccountNumber || ''} onChange={(e) => upd('bankAccountNumber', e.target.value)} placeholder="8-digit account no." className="rt-input" />
          </FormField>
        </div>
        <FormField label="Account Type">
          <input type="text" value={formData.accountType || ''} onChange={(e) => upd('accountType', e.target.value)} placeholder="e.g. Business" className="rt-input" />
        </FormField>
        <FormField label="Account Title">
          <input type="text" value={formData.accountTitle || ''} onChange={(e) => upd('accountTitle', e.target.value)} placeholder="Name on account" className="rt-input" />
        </FormField>
        <FormField label="Notes">
          <textarea value={formData.notes || ''} onChange={(e) => upd('notes', e.target.value)} placeholder="Sale notes..." className="rt-input" rows={3} />
        </FormField>
      </div>
    )
  }

  const activeItems = activeTab === 'Callbacks' ? callbacks : activeTab === 'Transfers' ? transfers : sales
  const activeType  = activeTab === 'Callbacks' ? 'callback' : activeTab === 'Transfers' ? 'transfer' : 'sale'

  const filteredData = useMemo(() => {
    if (!statusFilter) return activeItems
    return activeItems.filter(item => (item.status || item.cotStatus) === statusFilter)
  }, [activeItems, statusFilter])

  if (isLoading && !selectedAgent) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page"><TableSkeleton rows={8} cols={4} /></div>
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
            <button onClick={() => navigate('/manager')} className="mt-4 text-indigo-600 text-sm font-medium cursor-pointer border-0 bg-transparent">
              ← Back to dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Business Name', 'Owner', 'Utility & Supplier', 'Date', 'Status']
    const rows = activeItems.map(item => [
      item.id,
      item.customer?.businessName || item.ownerFullName || '',
      item.customer?.ownerName || item.ownerFullName || '',
      [item.customer?.utilityType || item.utilityType || '', item.supplier || ''].filter(Boolean).join(' - '),
      item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '',
      item.status || item.cotStatus || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab.toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusOptions = activeTab === 'Callbacks'
    ? ['pending', 'done', 'failed', 'chasing', 'overdue']
    : activeTab === 'Transfers'
    ? ['pending', 'approved', 'rejected', 'dispute', 'completed', 'failed', 'chasing', 'cotInProgress', 'hold']
    : ['chasing', 'cotInProgress', 'cotComplete', 'done', 'hold']

  const getBusinessName = (row) => row.customer?.businessName || row.ownerFullName || 'N/A'
  const getOwnerName = (row) => row.customer?.ownerName || row.ownerFullName || ''
  const getUtilitySupplier = (row) => {
    const util = row.customer?.utilityType || row.utilityType || ''
    const supp = row.supplier || row.customer?.currentSupplier || ''
    if (util && supp) return `${util.charAt(0).toUpperCase() + util.slice(1)} - ${supp}`
    if (util) return util.charAt(0).toUpperCase() + util.slice(1)
    if (supp) return supp
    return 'N/A'
  }

  const tableColumns = [
    { header: 'ID', cell: (row) => <span className="font-semibold text-slate-800">#{row.id}</span> },
    { header: 'Business Name', cell: (row) => (
      <span className="font-semibold text-slate-900 truncate max-w-[160px] inline-block" title={getBusinessName(row)}>
        {getBusinessName(row)}
      </span>
    )},
    { header: 'Owner', cell: (row) => (
      <span className="text-slate-500 text-[0.78rem] truncate max-w-[120px] inline-block" title={getOwnerName(row)}>
        {getOwnerName(row) || '-'}
      </span>
    )},
    { header: 'Utility & Supplier', cell: (row) => (
      <span className="text-slate-700 text-[0.78rem] truncate max-w-[140px] inline-block" title={getUtilitySupplier(row)}>
        {getUtilitySupplier(row)}
      </span>
    )},
    { header: 'Date', cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-GB') : 'N/A' },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status || row.cotStatus} type={activeTab === 'Callbacks' ? 'callback' : activeTab === 'Transfers' ? 'transfer' : 'sale'} /> },
    {
      header: '',
      cell: (row) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              if (activeTab === 'Callbacks') navigate(`/manager/callbacks/${row.id}`)
              else if (activeTab === 'Transfers') navigate(`/manager/transfers/${row.id}`)
              else if (activeTab === 'Sales') navigate(`/sales/${row.id}`)
            }}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-blue-50 hover:text-blue-500 transition-colors"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => {
              if (activeTab === 'Callbacks') navigate(`/callbacks/${row.id}/edit`)
              else if (activeTab === 'Transfers') navigate(`/transfers/${row.id}/edit`)
              else if (activeTab === 'Sales') navigate(`/sales/${row.id}`)
            }}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-indigo-50 hover:text-indigo-500 transition-colors"
            title="Edit"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => handleDelete(activeType, row.id)}
            className="p-1.5 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ]

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* Back */}
          <div className="rt-page-header">
            <button
              onClick={() => navigate('/manager')}
              className="flex items-center gap-1.5 border-0 bg-transparent text-sm text-slate-500 cursor-pointer hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Team Dashboard
            </button>
          </div>

          {/* Agent hero card */}
          <div className="rt-card rt-fade" style={{ marginBottom: '20px' }}>
            <div className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
                <User size={22} color="white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 truncate capitalize" style={{ textTransform: 'capitalize' }}>{agent.name}</h2>
                <p className="text-sm text-slate-500 truncate">{agent.email} · Agent</p>
              </div>
              <div className="shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">Active</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 rt-fade rt-d1">
            <StatCard icon={ArrowLeftRight} label="Transfers"   value={stats?.transfers        || 0}  accent="linear-gradient(135deg,#22c55e,#16a34a)" />
            <StatCard icon={PoundSterling}     label="Sales"       value={stats?.sales            || 0}  accent="linear-gradient(135deg,#f59e0b,#d97706)" />
            <StatCard icon={TrendingUp}     label="Conversion"  value={`${stats?.conversionRate || 0}%`} accent="linear-gradient(135deg,#8b5cf6,#7c3aed)" progress={stats?.conversionRate || 0} />
          </div>

          {/* Tabs card */}
          <div className="rt-card rt-fade rt-d2">
            {/* Tab bar */}
            <div className="flex border-b gap-1 px-4" style={{ borderColor: '#f1f5f9' }}>
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="py-3 px-3 border-none bg-none cursor-pointer text-sm font-medium transition-all"
                  style={{
                    color: activeTab === tab ? '#6366f1' : '#94a3b8',
                    borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                  }}>
                  {tab}
                  {tab !== 'Overview' && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: activeTab === tab ? '#eef2ff' : '#f8fafc', color: activeTab === tab ? '#6366f1' : '#94a3b8' }}>
                      {tab === 'Callbacks' ? callbacks.length : tab === 'Transfers' ? transfers.length : sales.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'Overview' && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-4">Recent Activity</h4>
                  {[
                    ...transfers.slice(0, 5).map(t => ({ ...t, _type: 'transfer' })),
                    ...sales.slice(0, 5).map(s => ({ ...s, _type: 'sale' })),
                  ]
                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                    .slice(0, 10)
                    .map((item, i) => {
                      const cfg = activityConfig[item._type]
                      const Icon = cfg.Icon
                      return (
                        <div key={i} onClick={() => { setActiveTab(item._type === 'transfer' ? 'Transfers' : 'Sales'); setStatusFilter(item.status || item.cotStatus || '') }}
                          className="flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer hover:bg-slate-100 transition-colors"
                          style={{ background: '#f8fafc' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: cfg.bg }}>
                            <Icon size={14} color={cfg.dot} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate capitalize">
                              {item._type} <span className="text-slate-400 font-normal">#{item.id}</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                            </p>
                          </div>
                          <StatusBadge status={item.status || item.cotStatus} type={item._type} />
                        </div>
                      )
                    })
                  }
                  {callbacks.length === 0 && transfers.length === 0 && sales.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No activity yet for this agent.</p>
                  )}
                </div>
              )}

              {/* ── DATA TABS ── */}
              {['Callbacks', 'Transfers', 'Sales'].map((tab) => {
                if (activeTab !== tab) return null
                const t = tab === 'Callbacks' ? 'callback' : tab === 'Transfers' ? 'transfer' : 'sale'
                return (
                  <div key={tab}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-500">
                          {activeItems.length} {tab.toLowerCase()}{activeItems.length !== 1 ? 's' : ''} total
                        </p>
                      <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rt-input text-xs py-1.5 w-auto"
                          >
                            <option value="">All Status</option>
                            {statusOptions.map(opt => (
                              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace(/([A-Z])/g, ' $1')}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={exportToCSV}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <Download size={14} /> Export
                        </button>
                        <button
                          onClick={() => { setShowCreateModal(t); setFormData({}) }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-0 bg-indigo-600 text-white text-xs font-semibold cursor-pointer hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                          <Plus size={14} /> Add {tab.slice(0, -1)} for {agent?.name?.split(' ')[0] || 'Agent'}
                        </button>
                      </div>
                    </div>

                    {activeItems.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-slate-400 text-sm">No {tab.toLowerCase()} found for this agent.</p>
                      </div>
                    ) : (
                      <DataTable columns={tableColumns} data={filteredData} pageSize={10}
                        searchKey={(row) => `${row.id} ${row.customer?.businessName || ''} ${row.customer?.ownerName || ''} ${row.ownerFullName || ''} ${row.supplier || ''} ${row.utilityType || ''}`}
                        onRowClick={(row) => {
                          if (activeTab === 'Callbacks') navigate(`/manager/callbacks/${row.id}`)
                          else if (activeTab === 'Transfers') navigate(`/manager/transfers/${row.id}`)
                          else if (activeTab === 'Sales') navigate(`/sales/${row.id}`)
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Create / Edit Modal */}
          <RecordModal
            isOpen={!!showCreateModal}
            onClose={resetForm}
            title={editItem
              ? `Edit ${showCreateModal?.charAt(0).toUpperCase() + showCreateModal?.slice(1)}`
              : `New ${showCreateModal?.charAt(0).toUpperCase() + showCreateModal?.slice(1)}`
            }
            onSave={editItem ? handleUpdate : handleCreate}
            saveLabel={saving ? 'Saving…' : editItem ? 'Update' : 'Create'}
          >
            {renderForm()}
          </RecordModal>

          {/* View Modal */}
          <RecordModal
            isOpen={!!viewItem}
            onClose={() => setViewItem(null)}
            title={`${activeType?.charAt(0).toUpperCase() + activeType?.slice(1)} #${viewItem?.id || ''}`}
            onSave={null}
          >
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="rt-label">ID</label>
                  <p className="text-sm font-semibold text-slate-900">#{viewItem?.id}</p>
                </div>
                <div>
                  <label className="rt-label">Status</label>
                  <StatusBadge status={viewItem?.status || viewItem?.cotStatus} type={activeType} />
                </div>
              </div>
              {viewItem?.utilityType && (
                <div>
                  <label className="rt-label">Utility Type</label>
                  <p className="text-sm text-slate-900 capitalize">{viewItem.utilityType}</p>
                </div>
              )}
              {viewItem?.supplier && (
                <div>
                  <label className="rt-label">Supplier</label>
                  <p className="text-sm text-slate-900">{viewItem.supplier}</p>
                </div>
              )}
              {viewItem?.accountNumber && (
                <div>
                  <label className="rt-label">Account Number</label>
                  <p className="text-sm text-slate-900">{viewItem.accountNumber}</p>
                </div>
              )}
              {viewItem?.scheduledDateTime && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="rt-label">Date</label>
                      <p className="text-sm text-slate-900">{new Date(viewItem.scheduledDateTime).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div>
                      <label className="rt-label">Time</label>
                      <p className="text-sm text-slate-900">{viewItem.scheduledDateTime.split('T')[1]?.slice(0, 5)}</p>
                    </div>
                  </div>
                  {viewItem.dayOfWeek && (
                    <div>
                      <label className="rt-label">Day of Week</label>
                      <p className="text-sm text-slate-900">{viewItem.dayOfWeek}</p>
                    </div>
                  )}
                </>
              )}
              {viewItem?.ownerFullName && (
                <div>
                  <label className="rt-label">Owner</label>
                  <p className="text-sm text-slate-900">{viewItem.ownerFullName}</p>
                </div>
              )}
              {viewItem?.homeAddress && (
                <div>
                  <label className="rt-label">Home Address</label>
                  <p className="text-sm text-slate-900">{viewItem.homeAddress}</p>
                </div>
              )}
              {viewItem?.dateOfBirth && (
                <div>
                  <label className="rt-label">Date of Birth</label>
                  <p className="text-sm text-slate-900">{new Date(viewItem.dateOfBirth).toLocaleDateString('en-GB')}</p>
                </div>
              )}
              {viewItem?.mpan && (
                <div>
                  <label className="rt-label">MPAN</label>
                  <p className="text-sm text-slate-900">{viewItem.mpan}</p>
                </div>
              )}
              {viewItem?.mprn && (
                <div>
                  <label className="rt-label">MPRN</label>
                  <p className="text-sm text-slate-900">{viewItem.mprn}</p>
                </div>
              )}
              {viewItem?.msn && (
                <div>
                  <label className="rt-label">MSN</label>
                  <p className="text-sm text-slate-900">{viewItem.msn}</p>
                </div>
              )}
              {viewItem?.createdAt && (
                <div>
                  <label className="rt-label">Created Date</label>
                  <p className="text-sm text-slate-900">{new Date(viewItem.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
              )}
              {viewItem?.notes && (
                <div>
                  <label className="rt-label">Notes</label>
                  <p className="text-sm text-slate-900">{viewItem.notes}</p>
                </div>
              )}
            </div>
          </RecordModal>

        </div>
      </div>
    </>
  )
}
