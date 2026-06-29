import { useEffect, useState, useCallback } from 'react'
import { useAdminStore } from '@/store/adminStore'
import api, { endpoints } from '@/lib/api'
import { UserPlus, CheckCircle, XCircle, Loader2, UserRoundCog, CalendarCheck, Check, X, Wallet, ChevronLeft, ChevronRight, Clock, Eye, Pencil, Save, Trash2 } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function PendingUsers() {
  const { pendingUsers, managers, loadPendingUsers, loadManagers, approveUser } = useAdminStore()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [error, setError] = useState('')

  const [pendingLeaves, setPendingLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [reviewProcessing, setReviewProcessing] = useState(null)

  const [pendingLoans, setPendingLoans] = useState([])
  const [loansLoading, setLoansLoading] = useState(false)
  const [loanReviewProcessing, setLoanReviewProcessing] = useState(null)
  const [loanHistory, setLoanHistory] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [loanHistoryLoading, setLoanHistoryLoading] = useState(false)
  const [leaveHistory, setLeaveHistory] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [leaveHistoryLoading, setLeaveHistoryLoading] = useState(false)
  const [deleteProcessing, setDeleteProcessing] = useState(null)
  const [selectedLoanForPayback, setSelectedLoanForPayback] = useState(null)
  const [paybackAmount, setPaybackAmount] = useState('')
  const [paybackNotes, setPaybackNotes] = useState('')
  const [recordingPayback, setRecordingPayback] = useState(false)

  const [selectedUser, setSelectedUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    api.get(endpoints.leaves.pending)
      .then(res => { setLeavesLoading(false); setPendingLeaves(res.data || []) })
      .catch(() => setLeavesLoading(false))
    api.get(endpoints.loans.pending)
      .then(res => { setLoansLoading(false); setPendingLoans(res.data || []) })
      .catch(() => setLoansLoading(false))
    api.get(endpoints.loans.all, { params: { page: 1, per_page: 20 } })
      .then(res => { setLoanHistoryLoading(false); setLoanHistory(res.data) })
      .catch(() => setLoanHistoryLoading(false))
    api.get(endpoints.leaves.all, { params: { page: 1, per_page: 20 } })
      .then(res => { setLeaveHistoryLoading(false); setLeaveHistory(res.data) })
      .catch(() => setLeaveHistoryLoading(false))
  }, [])

  const loadLoanHistory = useCallback((p) => {
    setLoanHistoryLoading(true)
    api.get(endpoints.loans.all, { params: { page: p, per_page: 20 } })
      .then(res => { setLoanHistoryLoading(false); setLoanHistory(res.data) })
      .catch(() => setLoanHistoryLoading(false))
  }, [])

  const loadLeaveHistory = useCallback((p) => {
    setLeaveHistoryLoading(true)
    api.get(endpoints.leaves.all, { params: { page: p, per_page: 20 } })
      .then(res => { setLeaveHistoryLoading(false); setLeaveHistory(res.data) })
      .catch(() => setLeaveHistoryLoading(false))
  }, [])

  const handleDeleteLoan = async (id) => {
    if (!window.confirm('Delete this loan record permanently?')) return
    setDeleteProcessing(id)
    try {
      await api.delete(endpoints.loans.delete(id))
      setLoanHistory((prev) => ({ ...prev, items: prev.items.filter((l) => l.id !== id), total: prev.total - 1 }))
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete loan')
    } finally { setDeleteProcessing(null) }
  }

  const handleDeleteLeave = async (id) => {
    if (!window.confirm('Delete this leave record permanently?')) return
    setDeleteProcessing(id)
    try {
      await api.delete(endpoints.leaves.delete(id))
      setLeaveHistory((prev) => ({ ...prev, items: prev.items.filter((l) => l.id !== id), total: prev.total - 1 }))
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete leave')
    } finally { setDeleteProcessing(null) }
  }

  const handleDeletePendingUser = async (user) => {
    if (!window.confirm(`Delete pending user "${user.name}" permanently?`)) return
    setDeleteProcessing(user.id)
    try {
      await useAdminStore.getState().deleteUser(user.id)
      await loadPendingUsers()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete user')
    } finally { setDeleteProcessing(null) }
  }

  useEffect(() => {
    Promise.all([loadPendingUsers(), loadManagers()]).then(() => setLoading(false))
  }, [loadPendingUsers, loadManagers])

  const handleReview = async (leaveId, status) => {
    setReviewProcessing(leaveId)
    try {
      await api.put(endpoints.leaves.review(leaveId), { status })
      setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId))
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to review leave')
    } finally { setReviewProcessing(null) }
  }

  const handleLoanReview = async (loanId, status) => {
    setLoanReviewProcessing(loanId)
    try {
      await api.put(endpoints.loans.review(loanId), { status })
      setPendingLoans((prev) => prev.filter((l) => l.id !== loanId))
      loadLoanHistory(1) // Refresh loan history when review occurs
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to review loan')
    } finally { setLoanReviewProcessing(null) }
  }

  const openPaybackModal = (loan) => {
    setSelectedLoanForPayback(loan)
    setPaybackAmount('')
    setPaybackNotes('')
    setError('')
  }

  const handlePaybackSubmit = async () => {
    const amt = parseFloat(paybackAmount)
    if (!amt || amt <= 0) {
      setError('Please enter a valid payback amount')
      return
    }
    const maxPayback = selectedLoanForPayback.amount - (selectedLoanForPayback.paidAmount || 0)
    if (amt > maxPayback + 0.01) {
      setError(`Amount cannot exceed the remaining balance of Rs. ${maxPayback.toLocaleString()}`)
      return
    }

    setRecordingPayback(true)
    setError('')
    try {
      const res = await api.put(endpoints.loans.payback(selectedLoanForPayback.id), {
        payback_amount: amt,
        admin_notes: paybackNotes.trim() || undefined
      })
      // Update in loanHistory list
      setLoanHistory((prev) => ({
        ...prev,
        items: prev.items.map((item) => item.id === selectedLoanForPayback.id ? res.data : item)
      }))
      setSelectedLoanForPayback(null)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to record payback')
    } finally {
      setRecordingPayback(false)
    }
  }

  const openEditModal = (user) => {
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      fatherName: user.fatherName || '',
      monthlySalary: user.monthlySalary != null ? user.monthlySalary : 0,
      cnic: user.cnic || '',
      department: user.department || '',
      designation: user.designation || '',
      dateOfBirth: user.dateOfBirth || '',
      dateOfJoining: user.dateOfJoining || '',
      emergContactName: user.emergContactName || '',
      emergContactNumber: user.emergContactNumber || '',
      managerId: user._selectedManagerId || '',
    })
    setSelectedUser(user)
    setError('')
  }

  const closeModal = () => {
    setSelectedUser(null)
    setEditForm({})
    setError('')
  }

  const handleFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleApproveWithEdit = async () => {
    if (!editForm.managerId) {
      setError('Select a manager first')
      return
    }
    setSavingEdit(true)
    setError('')
    try {
      const profileData = {}
      if (editForm.name) profileData.name = editForm.name
      if (editForm.email) profileData.email = editForm.email
      if (editForm.phone) profileData.phone = editForm.phone
      if (editForm.fatherName) profileData.fatherName = editForm.fatherName
      if (editForm.monthlySalary != null) profileData.monthlySalary = Number(editForm.monthlySalary)
      if (editForm.cnic) profileData.cnic = editForm.cnic
      if (editForm.department) profileData.department = editForm.department
      if (editForm.designation) profileData.designation = editForm.designation
      if (editForm.dateOfBirth) profileData.dateOfBirth = editForm.dateOfBirth
      if (editForm.dateOfJoining) profileData.dateOfJoining = editForm.dateOfJoining
      if (editForm.emergContactName) profileData.emergContactName = editForm.emergContactName
      if (editForm.emergContactNumber) profileData.emergContactNumber = editForm.emergContactNumber

      await approveUser(selectedUser.id, Number(editForm.managerId), profileData)
      closeModal()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve user')
    } finally {
      setSavingEdit(false)
    }
  }

  const columns = [
    {
      header: 'Name',
      cell: (row) => <span className="font-semibold text-slate-900">{row.name}</span>,
    },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Role',
      cell: (row) => (
        <span style={{
          padding: '2px 8px', borderRadius: '6px',
          background: row.role === 'manager' ? '#eef2ff' : '#f0fdf4',
          color: row.role === 'manager' ? '#4338ca' : '#15803d',
          fontWeight: 600, fontSize: '0.72rem', textTransform: 'capitalize',
        }}>{row.role}</span>
      ),
    },
    {
      header: 'Registered',
      cell: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-',
    },
    {
      header: 'Assign Manager',
      cell: (row) => (
        <select
          value={row._selectedManagerId || ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { row._selectedManagerId = Number(e.target.value); setError('') }}
          style={{
            padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
            fontSize: '13px', fontFamily: 'inherit', background: '#fff',
            cursor: 'pointer', outline: 'none', minWidth: '140px',
          }}
        >
          <option value="">Select manager...</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      ),
    },
    {
      header: 'Action',
      cell: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEditModal(row)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 border-none text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={() => handleDeletePendingUser(row)}
            disabled={deleteProcessing === row.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 border-none text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      ),
    },
  ]

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '13px', fontFamily: 'inherit', background: '#fff', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = { fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }

  if (loading) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page"><LoadingSpinner size={32} text="Loading pending users..." /></div>
    </>
  )

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          <div className="rt-fade" style={{ marginBottom: '28px' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: '#fffbeb' }}>
                <UserPlus size={20} color="#d97706" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pending Approvals</h1>
                <p className="text-sm text-slate-400 mt-0.5">{pendingUsers.length} {pendingUsers.length === 1 ? 'user' : 'users'} waiting for approval</p>
              </div>
            </div>
          </div>

          {error && !selectedUser && (
            <div className="rt-fade flex items-center gap-2 p-3 rounded-xl mb-5" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem' }}>
              <XCircle size={16} /> {error}
            </div>
          )}

          {managers.length === 0 && (
            <div className="rt-fade flex items-center gap-2 p-3 rounded-xl mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem' }}>
              <UserRoundCog size={16} color="#d97706" />
              <span>Create managers first before approving users</span>
            </div>
          )}

          {/* Pending Leave Requests */}
          <div className="rt-fade rt-card">
            <div className="rt-card-header">
              <div className="flex items-center gap-2.5">
                <div className="rt-card-icon" style={{ background: '#fffbeb' }}>
                  <CalendarCheck size={16} color="#d97706" />
                </div>
                <h2 className="rt-card-title">Leave Requests ({pendingLeaves.length})</h2>
              </div>
            </div>
            <div className="rt-card-body">
              {leavesLoading ? (
                <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
              ) : pendingLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <CalendarCheck size={28} color="#94a3b8" />
                  <p className="text-sm font-semibold text-slate-500 mt-3">No pending leave requests</p>
                  <p className="text-xs text-slate-400 mt-1">All caught up!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Agent</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Type</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">From</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">To</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Reason</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLeaves.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td className="py-2.5 px-2 font-semibold text-slate-800 text-xs">{l.userName || `User #${l.userId}`}</td>
                          <td className="py-2.5 px-2 text-slate-600 text-xs">{l.leaveType}</td>
                          <td className="py-2.5 px-2 text-slate-600 text-xs">{new Date(l.fromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                          <td className="py-2.5 px-2 text-slate-600 text-xs">{new Date(l.toDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                          <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[160px] truncate">{l.reason || '-'}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleReview(l.id, 'approved')}
                                disabled={reviewProcessing === l.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 text-white disabled:opacity-50 transition-all"
                                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                              >
                                {reviewProcessing === l.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(l.id, 'rejected')}
                                disabled={reviewProcessing === l.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 text-white disabled:opacity-50 transition-all"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Pending Loan Requests */}
          <div className="rt-fade rt-card" style={{ marginTop: '24px' }}>
            <div className="rt-card-header">
              <div className="flex items-center gap-2.5">
                <div className="rt-card-icon" style={{ background: '#ecfdf5' }}>
                  <Wallet size={16} color="#16a34a" />
                </div>
                <h2 className="rt-card-title">Loan Requests ({pendingLoans.length})</h2>
              </div>
            </div>
            <div className="rt-card-body">
              {loansLoading ? (
                <p className="text-sm text-slate-400 text-center py-6">Loading...</p>
              ) : pendingLoans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Wallet size={28} color="#94a3b8" />
                  <p className="text-sm font-semibold text-slate-500 mt-3">No pending loan requests</p>
                  <p className="text-xs text-slate-400 mt-1">All caught up!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Agent</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Amount</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Reason</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Date</th>
                        <th className="text-left py-2.5 px-2 font-semibold text-slate-500 text-xs uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLoans.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td className="py-2.5 px-2 font-semibold text-slate-800 text-xs">{l.userName || `User #${l.userId}`}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-900 text-sm">Rs. {Number(l.amount).toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-slate-500 text-xs max-w-[160px] truncate">{l.reason || '-'}</td>
                          <td className="py-2.5 px-2 text-slate-600 text-xs">{new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLoanReview(l.id, 'approved')}
                                disabled={loanReviewProcessing === l.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 text-white disabled:opacity-50 transition-all"
                                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                              >
                                {loanReviewProcessing === l.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleLoanReview(l.id, 'rejected')}
                                disabled={loanReviewProcessing === l.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 text-white disabled:opacity-50 transition-all"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rt-fade rt-card" style={{ marginTop: '24px' }}>
            <div className="rt-card-header">
              <div className="flex items-center gap-2.5">
                <div className="rt-card-icon" style={{ background: '#eef2ff' }}>
                  <UserPlus size={16} color="#6366f1" />
                </div>
                <h2 className="rt-card-title">Pending Approvals ({pendingUsers.length})</h2>
              </div>
            </div>
            <div className="rt-card-body">
              {pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <UserPlus size={28} color="#94a3b8" />
                  <p className="text-sm font-semibold text-slate-500 mt-3">You're all caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">No pending approvals</p>
                </div>
              ) : (
                <DataTable columns={columns} data={pendingUsers} pageSize={10} onRowClick={(row) => openEditModal(row)} />
              )}
            </div>
          </div>

          {/* Loan History */}
          <div className="rt-fade rt-card" style={{ marginTop: '24px' }}>
            <div className="rt-card-header">
              <div className="flex items-center gap-2.5">
                <div className="rt-card-icon" style={{ background: '#f1f5f9' }}>
                  <Wallet size={16} color="#64748b" />
                </div>
                <h2 className="rt-card-title">Loan History ({loanHistory.total || 0})</h2>
              </div>
            </div>
            <div className="rt-card-body p-0 overflow-x-auto">
              {loanHistoryLoading ? (
                <p className="text-sm text-slate-400 text-center py-6">Loading history...</p>
              ) : loanHistory.items?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Wallet size={28} color="#94a3b8" />
                  <p className="text-sm font-semibold text-slate-500 mt-3">No loan history</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Agent</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Total</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Paid Back</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Pending</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Reason</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanHistory.items.map((l) => {
                        const s = l.status === 'approved'
                          ? { bg: '#dcfce7', color: '#16a34a', label: 'Approved' }
                          : l.status === 'rejected'
                          ? { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' }
                          : { bg: '#fef3c7', color: '#d97706', label: 'Pending' }
                        const isApproved = l.status === 'approved'
                        const remaining = isApproved ? (l.amount - (l.paidAmount || 0)) : 0
                        return (
                          <tr key={l.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 text-xs">{l.userName || `User #${l.userId}`}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 text-xs">Rs. {Number(l.amount).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-xs text-green-600 font-semibold">{isApproved ? `Rs. ${Number(l.paidAmount || 0).toLocaleString()}` : '-'}</td>
                            <td className="py-2.5 px-3 text-xs text-indigo-600 font-bold">{isApproved ? `Rs. ${Number(remaining).toLocaleString()}` : '-'}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-xs max-w-[120px] truncate" title={l.reason || ''}>{l.reason || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                                {l.status === 'approved' ? <CheckCircle size={11} /> : l.status === 'rejected' ? <XCircle size={11} /> : <Clock size={11} />}
                                {s.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">{new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                {isApproved && remaining > 0 && (
                                  <button
                                    onClick={() => openPaybackModal(l)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 text-white transition-all"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                                  >
                                    Payback
                                  </button>
                                )}
                                <button onClick={() => handleDeleteLoan(l.id)} disabled={deleteProcessing === l.id}
                                  className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 text-white disabled:opacity-50 transition-all"
                                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {loanHistory.totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <p className="text-xs text-slate-400">{loanHistory.total} total</p>
                      <div className="flex items-center gap-2">
                        <button disabled={loanHistory.page <= 1} onClick={() => loadLoanHistory(loanHistory.page - 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"><ChevronLeft size={14} /></button>
                        <span className="text-xs font-semibold text-slate-500">{loanHistory.page} / {loanHistory.totalPages}</span>
                        <button disabled={loanHistory.page >= loanHistory.totalPages} onClick={() => loadLoanHistory(loanHistory.page + 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"><ChevronRight size={14} /></button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Leave History */}
          <div className="rt-fade rt-card" style={{ marginTop: '24px' }}>
            <div className="rt-card-header">
              <div className="flex items-center gap-2.5">
                <div className="rt-card-icon" style={{ background: '#f1f5f9' }}>
                  <CalendarCheck size={16} color="#64748b" />
                </div>
                <h2 className="rt-card-title">Leave History ({leaveHistory.total || 0})</h2>
              </div>
            </div>
            <div className="rt-card-body p-0 overflow-x-auto">
              {leaveHistoryLoading ? (
                <p className="text-sm text-slate-400 text-center py-6">Loading history...</p>
              ) : leaveHistory.items?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <CalendarCheck size={28} color="#94a3b8" />
                  <p className="text-sm font-semibold text-slate-500 mt-3">No leave history</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Agent</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Type</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">From</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">To</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Reason</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-slate-500 text-xs uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveHistory.items.map((l) => {
                        const s = l.status === 'approved'
                          ? { bg: '#dcfce7', color: '#16a34a', label: 'Approved' }
                          : l.status === 'rejected'
                          ? { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' }
                          : { bg: '#fef3c7', color: '#d97706', label: 'Pending' }
                        return (
                          <tr key={l.id} className="hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 text-xs">{l.userName || `User #${l.userId}`}</td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">{l.leaveType}</td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">{new Date(l.fromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">{new Date(l.toDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-xs max-w-[120px] truncate">{l.reason || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                                {l.status === 'approved' ? <CheckCircle size={11} /> : l.status === 'rejected' ? <XCircle size={11} /> : <Clock size={11} />}
                                {s.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <button onClick={() => handleDeleteLeave(l.id)} disabled={deleteProcessing === l.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 text-white disabled:opacity-50 transition-all"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                <X size={10} /> Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {leaveHistory.totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <p className="text-xs text-slate-400">{leaveHistory.total} total</p>
                      <div className="flex items-center gap-2">
                        <button disabled={leaveHistory.page <= 1} onClick={() => loadLeaveHistory(leaveHistory.page - 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"><ChevronLeft size={14} /></button>
                        <span className="text-xs font-semibold text-slate-500">{leaveHistory.page} / {leaveHistory.totalPages}</span>
                        <button disabled={leaveHistory.page >= leaveHistory.totalPages} onClick={() => loadLeaveHistory(leaveHistory.page + 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"><ChevronRight size={14} /></button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {selectedUser && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '640px',
              maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              padding: '28px',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <UserPlus size={18} color="#6366f1" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Staff Profile</h3>
                  <p className="text-xs text-slate-400">{selectedUser.name} &middot; <span style={{ textTransform: 'capitalize' }}>{selectedUser.role}</span></p>
                </div>
              </div>
              <button onClick={closeModal} className="flex items-center justify-center w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer hover:bg-slate-100 transition-colors" style={{ color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.82rem' }}>
                <XCircle size={16} /> {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={inputStyle} value={editForm.name} onChange={(e) => handleFieldChange('name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={editForm.email} onChange={(e) => handleFieldChange('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={editForm.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input style={inputStyle} value={editForm.fatherName} onChange={(e) => handleFieldChange('fatherName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>CNIC</label>
                <input style={inputStyle} value={editForm.cnic} onChange={(e) => handleFieldChange('cnic', e.target.value)} placeholder="xxxxx-xxxxxxx-x" />
              </div>
              <div>
                <label style={labelStyle}>Monthly Salary (Rs.)</label>
                <input style={inputStyle} type="number" value={editForm.monthlySalary} onChange={(e) => handleFieldChange('monthlySalary', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <input style={inputStyle} value={editForm.department} onChange={(e) => handleFieldChange('department', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Designation</label>
                <input style={inputStyle} value={editForm.designation} onChange={(e) => handleFieldChange('designation', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input style={inputStyle} type="date" value={editForm.dateOfBirth} onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Date of Joining</label>
                <input style={inputStyle} type="date" value={editForm.dateOfJoining} onChange={(e) => handleFieldChange('dateOfJoining', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Emergency Contact Name</label>
                <input style={inputStyle} value={editForm.emergContactName} onChange={(e) => handleFieldChange('emergContactName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Emergency Contact Number</label>
                <input style={inputStyle} value={editForm.emergContactNumber} onChange={(e) => handleFieldChange('emergContactNumber', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Assign Manager</label>
                <select
                  value={editForm.managerId}
                  onChange={(e) => handleFieldChange('managerId', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select manager...</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={closeModal} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border" style={{ background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}>
                Cancel
              </button>
              <button
                onClick={handleApproveWithEdit}
                disabled={savingEdit || !editForm.managerId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border-none text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {savingEdit ? 'Approving...' : 'Approve & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLoanForPayback && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="rt-card rt-fade" style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px 28px' }}>
            <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
                <Wallet size={16} color="#6366f1" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Record Payback</h3>
            </div>
            
            <div className="text-xs text-slate-500 mb-4 leading-relaxed">
              Recording payback for <strong>{selectedLoanForPayback.userName}</strong>'s loan.
              <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                <div>Total Amount: <strong>Rs. {Number(selectedLoanForPayback.amount).toLocaleString()}</strong></div>
                <div>Already Paid: <strong className="text-green-600">Rs. {Number(selectedLoanForPayback.paidAmount || 0).toLocaleString()}</strong></div>
                <div>Remaining: <strong className="text-indigo-600">Rs. {Number(selectedLoanForPayback.amount - (selectedLoanForPayback.paidAmount || 0)).toLocaleString()}</strong></div>
              </div>
            </div>

            {error && (
              <div className="p-2 mb-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
                <XCircle size={14} />
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Payback Amount (Rs.)</label>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="e.g. 5000"
                  value={paybackAmount}
                  onChange={(e) => setPaybackAmount(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Admin Notes / Remarks</label>
                <textarea
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                  rows={3}
                  placeholder="e.g. Deducted from June salary"
                  value={paybackNotes}
                  onChange={(e) => setPaybackNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => setSelectedLoanForPayback(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border" style={{ background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}>
                Cancel
              </button>
              <button
                onClick={handlePaybackSubmit}
                disabled={recordingPayback || !paybackAmount || parseFloat(paybackAmount) <= 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border-none text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                {recordingPayback ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Record Payback
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
