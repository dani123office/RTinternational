import { useEffect, useState } from 'react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import { useToast } from '@/components/ui/toastContext'
import { Wallet, Plus, Loader2, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const statusStyle = {
  pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
  approved: { bg: '#dcfce7', color: '#16a34a', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
}

export default function Loans() {
  const { toast } = useToast()
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(endpoints.loans.my, { params: { page: 1, per_page: 20 } })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadLoans = (p) => {
    setLoading(true)
    api.get(endpoints.loans.my, { params: { page: p, per_page: 20 } })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleSubmit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast('Please enter a valid amount', 'error'); return }
    if (!reason.trim()) { toast('Please enter a reason', 'error'); return }

    setSubmitting(true)
    try {
      await api.post(endpoints.loans.create, { amount: amt, reason: reason.trim() })
      toast('Loan request submitted', 'success')
      setShowForm(false)
      setAmount('')
      setReason('')
      loadLoans(1)
    } catch (err) {
      toast(err?.response?.data?.detail || 'Failed to submit loan request', 'error')
    } finally { setSubmitting(false) }
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div className="rt-fade flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ecfdf5' }}>
                <Wallet size={20} color="#16a34a" />
              </div>
              <div>
                <h1 className="rt-page-title">Loan Requests</h1>
                <p className="rt-page-subtitle">Apply for and track your loan requests</p>
              </div>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer border-0 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                <Plus size={16} /> New Request
              </button>
            )}
          </div>

          {/* Stats Summary Box */}
          {!loading && data.items?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 rt-fade">
              <div className="rt-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid #94a3b8' }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Approved</span>
                <span className="text-lg font-extrabold text-slate-900 mt-2">
                  Rs. {data.items.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="rt-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid #16a34a' }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid Back</span>
                <span className="text-lg font-extrabold text-green-600 mt-2">
                  Rs. {data.items.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.paidAmount || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="rt-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid #6366f1' }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Balance</span>
                <span className="text-lg font-extrabold text-indigo-600 mt-2">
                  Rs. {data.items.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {showForm && (
            <div className="rt-card rt-fade mb-6">
              <div className="rt-card-header">
                <div className="rt-card-header-left">
                  <div className="rt-card-icon" style={{ background: '#eef2ff' }}>
                    <Plus size={16} color="#6366f1" />
                  </div>
                  <span className="rt-card-title">New Loan Request</span>
                </div>
                <button onClick={() => setShowForm(false)} className="text-xs font-semibold text-slate-400 bg-transparent border-0 cursor-pointer">Cancel</button>
              </div>
              <div className="rt-card-body" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Loan Amount (Rs.)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      style={{
                        padding: '10px 14px', border: '1px solid #e2e6ec', borderRadius: '10px',
                        fontSize: '14px', color: '#0f172a', outline: 'none', maxWidth: '280px', background: '#f8fafc',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reason</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why do you need this loan?"
                      rows={3}
                      style={{
                        padding: '10px 14px', border: '1px solid #e2e6ec', borderRadius: '10px',
                        fontSize: '14px', color: '#0f172a', outline: 'none', resize: 'vertical',
                        fontFamily: 'inherit', background: '#f8fafc',
                      }}
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer border-0 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rt-card rt-fade">
            <div className="rt-card-header">
              <div>
                <h2 className="rt-card-title">Your Requests</h2>
                <p className="text-sm text-slate-500">{data.total} total</p>
              </div>
            </div>
            <div className="rt-card-body p-0 overflow-x-auto">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
              ) : data.items?.length === 0 ? (
                <div className="flex flex-col items-center py-10">
                  <Wallet size={32} color="#94a3b8" />
                  <p className="text-sm font-semibold text-slate-500 mt-3">No loan requests yet</p>
                </div>
              ) : (
                <table className="w-full min-w-[650px] text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-[0.16em]">
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Total</th>
                      <th className="text-left px-4 py-3">Paid Back</th>
                      <th className="text-left px-4 py-3">Pending</th>
                      <th className="text-left px-4 py-3">Reason</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => {
                      const s = statusStyle[r.status] || statusStyle.pending
                      const isApproved = r.status === 'approved'
                      const remaining = isApproved ? (r.amount - (r.paidAmount || 0)) : 0
                      return (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-slate-800 text-xs">
                            {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900">
                            Rs. {Number(r.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-green-600 font-medium">
                            {isApproved ? `Rs. ${Number(r.paidAmount || 0).toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-indigo-600 font-bold">
                            {isApproved ? `Rs. ${Number(remaining).toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[150px] truncate" title={r.reason || ''}>
                            <div>{r.reason || '-'}</div>
                            {r.adminNotes && (
                              <div className="text-[10px] text-amber-600 mt-1 font-semibold whitespace-normal leading-normal" title={r.adminNotes}>
                                Remarks: {r.adminNotes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                              {r.status === 'pending' ? <Clock size={11} /> : r.status === 'approved' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                <p className="text-xs text-slate-400">{data.total} total</p>
                <div className="flex items-center gap-2">
                  <button disabled={data.page <= 1} onClick={() => loadLoans(data.page - 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-semibold text-slate-500">{data.page} / {data.totalPages}</span>
                  <button disabled={data.page >= data.totalPages} onClick={() => loadLoans(data.page + 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-40"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}