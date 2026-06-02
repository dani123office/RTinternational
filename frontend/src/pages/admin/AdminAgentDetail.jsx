import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import { useToast } from '@/components/ui/toastContext'
import api, { endpoints } from '@/lib/api'
import EditStaffModal from '@/components/admin/EditStaffModal'
import {
  ArrowLeft, User, ArrowLeftRight, PoundSterling,
  TrendingUp, Mail, Calendar, UserSquare2, CreditCard, Briefcase, DollarSign, Heart, BadgePercent, Building2,
  Clock, CalendarCheck,
} from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function statusBadge(status) {
  const map = {
    pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
    approved: { bg: '#dcfce7', color: '#16a34a', label: 'Approved' },
    rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
  }
  const s = map[status] || map.pending
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

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

const tabs = ['Callbacks', 'Transfers', 'Sales', 'Attendance', 'Leaves']

export default function AdminAgentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selectedAgent, loadAdminAgentDetail, isLoading, error } = useAdminStore()

  const [activeTab, setActiveTab] = useState('Transfers')
  const [statusFilter, setStatusFilter] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [leaveHistory, setLeaveHistory] = useState([])
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, late: 0 })
  const [pendingLeaves, setPendingLeaves] = useState(0)

  const handleSaveStaff = useCallback(async (payload) => {
    const res = await api.put(endpoints.admin.updateAgentStaff(Number(id)), payload)
    await loadAdminAgentDetail(Number(id))
    toast('Staff profile updated successfully', 'success')
    return res.data
  }, [id, loadAdminAgentDetail, toast])

  useEffect(() => { if (id) loadAdminAgentDetail(Number(id)) }, [id, loadAdminAgentDetail])

  useEffect(() => {
    if (!id) return
    api.get(endpoints.attendance.agentHistory(Number(id)), { params: { page: 1, perPage: 1 } }).then((res) => {
      setAttendanceStats({ total: res.data.total || 0, late: 0 })
    }).catch(() => {})
    api.get(endpoints.leaves.agent(Number(id)), { params: { page: 1, perPage: 100 } }).then((res) => {
      const items = res.data.items || []
      setPendingLeaves(items.filter((l) => l.status === 'pending').length)
    }).catch(() => {})
  }, [id])

  const agent     = selectedAgent?.agent
  const stats     = selectedAgent?.stats
  const callbacks = selectedAgent?.callbacks || []
  const transfers = selectedAgent?.transfers || []
  const sales     = selectedAgent?.sales || []

  const activeItems = activeTab === 'Callbacks' ? callbacks : activeTab === 'Transfers' ? transfers : sales

  const filteredData = useMemo(() => {
    if (activeTab === 'Attendance' || activeTab === 'Leaves') return []
    if (!statusFilter) return activeItems
    return activeItems.filter(item => (item.status || item.cotStatus) === statusFilter)
  }, [activeItems, statusFilter, activeTab])

  const loadAttendance = useCallback(async () => {
    if (activeTab !== 'Attendance' || !id) return
    setAttendanceLoading(true)
    try {
      const res = await api.get(endpoints.attendance.agentHistory(Number(id)), { params: { page: 1, perPage: 20 } })
      setAttendanceHistory(res.data.items || [])
    } catch {} finally { setAttendanceLoading(false) }
  }, [id, activeTab])

  const loadLeaves = useCallback(async () => {
    if (activeTab !== 'Leaves' || !id) return
    setLeaveLoading(true)
    try {
      const res = await api.get(endpoints.leaves.agent(Number(id)), { params: { page: 1, perPage: 20 } })
      setLeaveHistory(res.data.items || [])
    } catch {} finally { setLeaveLoading(false) }
  }, [id, activeTab])

  useEffect(() => { loadAttendance() }, [loadAttendance])
  useEffect(() => { loadLeaves() }, [loadLeaves])

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

          {/* Staff Profile Info */}
          <div className="rt-card rt-fade rt-d1" style={{ marginBottom: '20px' }}>
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <UserSquare2 size={16} color="#6366f1" />
                </div>
                <span className="rt-card-title">Staff Profile Info</span>
              </div>
              <button onClick={() => setShowEditModal(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors flex items-center gap-1">
                Edit Profile
              </button>
            </div>
              <div className="rt-card-body" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px' }}>
                  {agent.fatherName && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Father's Name</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{agent.fatherName}</p>
                    </div>
                  )}
                  {agent.cnic && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>CNIC</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{agent.cnic}</p>
                    </div>
                  )}
                  {agent.phone && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Telephone</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{agent.phone}</p>
                    </div>
                  )}
                  {agent.designation && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Designation</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{agent.designation}</p>
                    </div>
                  )}
                  {agent.department && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Department</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{agent.department}</p>
                    </div>
                  )}
                  {agent.monthlySalary !== null && agent.monthlySalary !== undefined && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Monthly Salary</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Rs. {Number(agent.monthlySalary).toLocaleString()}</p>
                    </div>
                  )}
                  {agent.dateOfBirth && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Date of Birth</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{new Date(agent.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                  {agent.dateOfJoining && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Date of Joining</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{new Date(agent.dateOfJoining).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                  {agent.emergContactName && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>Emergency Contact</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        {agent.emergContactName}{agent.emergContactNumber ? ` (${agent.emergContactNumber})` : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 rt-fade rt-d1">
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
              <div className="rt-card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
                  <Clock size={18} color="#ef4444" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Attendance</p>
                  <p className="text-2xl font-extrabold text-slate-900">{attendanceStats.total}</p>
                </div>
              </div>
              <div className="rt-card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fffbeb' }}>
                  <CalendarCheck size={18} color="#d97706" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pending Leaves</p>
                  <p className="text-2xl font-extrabold text-slate-900">{pendingLeaves}</p>
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

              {activeTab === 'Attendance' ? (
                attendanceLoading ? (
                  <div className="text-center py-8"><p className="text-sm text-slate-400">Loading attendance...</p></div>
                ) : attendanceHistory.length === 0 ? (
                  <div className="text-center py-8"><p className="text-sm text-slate-400">No attendance records found.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Date</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Check In</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Check Out</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Status</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Checkin Reason</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Checkout Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceHistory.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-2.5 px-2 font-semibold text-slate-800">{new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="py-2.5 px-2 text-slate-600">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}</td>
                            <td className="py-2.5 px-2 text-slate-600">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-'}</td>
                            <td className="py-2.5 px-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                                background: r.status === 'late' ? '#fee2e2' : '#dcfce7',
                                color: r.status === 'late' ? '#dc2626' : '#16a34a',
                              }}>{r.status === 'late' ? 'LATE' : 'ON TIME'}</span>
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[140px] truncate">{r.checkin_reason || '-'}</td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[140px] truncate">{r.checkout_reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : activeTab === 'Leaves' ? (
                leaveLoading ? (
                  <div className="text-center py-8"><p className="text-sm text-slate-400">Loading leave requests...</p></div>
                ) : leaveHistory.length === 0 ? (
                  <div className="text-center py-8"><p className="text-sm text-slate-400">No leave requests found.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Type</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">From</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">To</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Reason</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Status</th>
                          <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Admin Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveHistory.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-2.5 px-2 font-semibold text-slate-800 text-xs">{l.leaveType}</td>
                            <td className="py-2.5 px-2 text-slate-600 text-xs">{new Date(l.fromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                            <td className="py-2.5 px-2 text-slate-600 text-xs">{new Date(l.toDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[140px] truncate">{l.reason || '-'}</td>
                            <td className="py-2.5 px-2">{statusBadge(l.status)}</td>
                            <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[120px] truncate">{l.adminNotes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : activeItems.length === 0 ? (
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
                    const to = activeTab === 'Callbacks' ? `/admin/callbacks/${row.id}`
                      : activeTab === 'Transfers' ? `/admin/transfers/${row.id}`
                      : `/admin/sales/${row.id}`
                    navigate(to, { state: { agentId: Number(id) } })
                  }}
                />
              )}
            </div>
          </div>

          <EditStaffModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveStaff}
            agent={agent}
          />

        </div>
      </div>
    </>
  )
}
