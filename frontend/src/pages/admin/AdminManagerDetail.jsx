import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import { useToast } from '@/components/ui/toastContext'
import api, { endpoints } from '@/lib/api'
import EditStaffModal from '@/components/admin/EditStaffModal'
import {
  ArrowLeft, UserCog, Users, ArrowLeftRight,
  PoundSterling, TrendingUp, Mail, UserSquare2,
  FileText, Clock, CreditCard, Briefcase, Building2,
} from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function AdminManagerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selectedManager, loadAdminManagerDetail, isLoading, error } = useAdminStore()
  const [showEditModal, setShowEditModal] = useState(false)

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('adminSelectedMonth')
    if (saved) return saved
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    localStorage.setItem('adminSelectedMonth', selectedMonth)
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

  const { filterYear, filterMonth } = useMemo(() => {
    if (selectedMonth === 'all') return { filterYear: null, filterMonth: null }
    const [y, m] = selectedMonth.split('-').map(Number)
    return { filterYear: y, filterMonth: m }
  }, [selectedMonth])

  useEffect(() => {
    if (id) {
      loadAdminManagerDetail(Number(id), filterYear, filterMonth)
    }
  }, [id, loadAdminManagerDetail, filterYear, filterMonth])

  const handleSaveStaff = useCallback(async (payload) => {
    const res = await api.put(endpoints.admin.updateAgentStaff(Number(id)), payload)
    await loadAdminManagerDetail(Number(id), filterYear, filterMonth)
    toast('Manager profile updated successfully', 'success')
    return res.data
  }, [id, loadAdminManagerDetail, filterYear, filterMonth, toast])

  const manager = selectedManager?.manager
  const agents  = selectedManager?.agents || []

  if (isLoading && !selectedManager) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page"><LoadingSpinner size={32} text="Loading manager details..." /></div>
      </>
    )
  }

  if (!manager) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="rt-card p-10 text-center">
            <p className="text-slate-400 text-sm">{error || 'Manager not found.'}</p>
            <Link to="/admin/staff" className="mt-4 text-indigo-600 text-sm font-medium inline-block">← Back to Staff</Link>
          </div>
        </div>
      </>
    )
  }

  const totalTransfers = agents.reduce((s, a) => s + (a.transfers || 0), 0)
  const totalSales     = agents.reduce((s, a) => s + (a.sales || 0), 0)
  const conversion     = totalTransfers > 0 ? ((totalSales / totalTransfers) * 100).toFixed(1) : '0.0'

  const columns = [
    { header: 'Name', cell: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
    { header: 'Callbacks', accessor: 'callbacks' },
    { header: 'Transfers', accessor: 'transfers' },
    { header: 'Sales', accessor: 'sales' },
    {
      header: 'Conversion',
      cell: (row) => {
        const bg = row.conversionRate > 30 ? '#d1fae5' : row.conversionRate > 10 ? '#fef3c7' : '#fee2e2'
        const color = row.conversionRate > 30 ? '#065f46' : row.conversionRate > 10 ? '#92400e' : '#991b1b'
        return <span style={{ padding: '2px 8px', borderRadius: '6px', background: bg, color, fontWeight: 600, fontSize: '0.78rem' }}>{row.conversionRate}%</span>
      },
    },
  ]

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          <div className="rt-page-header flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Link to="/admin/staff" className="flex items-center gap-1.5 text-sm text-slate-500 no-underline hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} /> Back to Staff
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '6px 12px', border: '1px solid #e2e6ec', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 600, color: '#0f172a', outline: 'none',
                  background: 'white', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rt-card rt-fade" style={{ marginBottom: '20px' }}>
            <div className="flex items-center gap-4 p-5" style={{ flexWrap: 'wrap' }}>
              <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <UserCog size={22} color="white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 truncate">{manager.name}</h2>
                <p className="text-sm text-slate-500 truncate flex items-center gap-1">
                  <Mail size={13} /> {manager.email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/admin/payroll?userId=${manager.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors no-underline"
                >
                  <FileText size={14} /> Generate Salary Slip
                </Link>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: manager.isActive ? '#d1fae5' : '#fee2e2', color: manager.isActive ? '#065f46' : '#991b1b' }}>
                  {manager.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Staff Profile Info */}
          <div className="rt-card rt-fade rt-d1" style={{ marginBottom: '20px' }}>
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <UserSquare2 size={16} color="#8b5cf6" />
                </div>
                <span className="rt-card-title">Manager Profile &amp; Employment Details</span>
              </div>
              <button onClick={() => setShowEditModal(true)} className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors flex items-center gap-1">
                Edit Profile
              </button>
            </div>
            <div className="rt-card-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px' }}>
                {manager.fatherName && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Father's Name</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.fatherName}</p>
                  </div>
                )}
                {manager.cnic && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>CNIC</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.cnic}</p>
                  </div>
                )}
                {manager.phone && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Telephone</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.phone}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Designation</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.designation || 'Manager'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Department</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.department || 'Management'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Monthly Salary</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a', margin: 0 }}>
                    Rs. {Number(manager.monthlySalary || 0).toLocaleString()}
                  </p>
                </div>
                {manager.dateOfBirth && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Date of Birth</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{new Date(manager.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                {manager.dateOfJoining && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Date of Joining</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{new Date(manager.dateOfJoining).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                {manager.emergContactName && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Emergency Contact</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                      {manager.emergContactName}{manager.emergContactNumber ? ` (${manager.emergContactNumber})` : ''}
                    </p>
                  </div>
                )}
                {manager.bankName && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Bank Name</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.bankName}</p>
                  </div>
                )}
                {manager.bankAccountNumber && (
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Bank Account Number</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.bankAccountNumber}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Job Cadre</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{manager.jobCadre || 'Full time'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Shift Timing (PKT)</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} className="text-purple-600 inline shrink-0" />
                    <span>{manager.shiftStartTime || '14:00'} — {manager.shiftEndTime || '22:00'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 rt-fade rt-d1">
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                <Users size={18} color="#6366f1" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Team Size</p>
                <p className="text-2xl font-extrabold text-slate-900">{selectedManager?.teamSize || 0}</p>
              </div>
            </div>
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <ArrowLeftRight size={18} color="#16a34a" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Transfers</p>
                <p className="text-2xl font-extrabold text-slate-900">{totalTransfers}</p>
              </div>
            </div>
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                <PoundSterling size={18} color="#d97706" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sales</p>
                <p className="text-2xl font-extrabold text-slate-900">{totalSales}</p>
              </div>
            </div>
            <div className="rt-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f5f3ff' }}>
                <TrendingUp size={18} color="#8b5cf6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conversion</p>
                <p className="text-2xl font-extrabold text-slate-900">{conversion}%</p>
              </div>
            </div>
          </div>

          <div className="rt-card rt-fade">
            <div className="rt-card-body">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Team Agents ({agents.length})</h3>
              {agents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-sm">No agents assigned to this manager yet.</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={agents}
                  pageSize={10}
                  searchKey="name"
                  onRowClick={(row) => navigate(`/admin/agents/${row.id}`)}
                />
              )}
            </div>
          </div>

        </div>
      </div>
      <EditStaffModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveStaff}
        agent={manager}
      />
    </>
  )
}
