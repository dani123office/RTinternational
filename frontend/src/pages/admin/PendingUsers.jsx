import { useEffect, useState } from 'react'
import { useAdminStore } from '@/store/adminStore'
import { UserPlus, CheckCircle, XCircle, Loader2, UserRoundCog } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'

export default function PendingUsers() {
  const { pendingUsers, managers, loadPendingUsers, loadManagers, approveUser } = useAdminStore()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([loadPendingUsers(), loadManagers()]).then(() => setLoading(false))
  }, [loadPendingUsers, loadManagers])

  const handleApprove = async (user) => {
    if (!user._selectedManagerId) {
      setError(`Select a manager for ${user.name} first`)
      return
    }
    setError('')
    setProcessing(user.id)
    try {
      await approveUser(user.id, user._selectedManagerId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve user')
    } finally {
      setProcessing(null)
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
        <button
          onClick={() => handleApprove(row)}
          disabled={processing === row.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 border-none text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          {processing === row.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {processing === row.id ? 'Approving...' : 'Approve'}
        </button>
      ),
    },
  ]

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
                <p className="text-sm text-slate-400 mt-0.5">{pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} waiting for approval</p>
              </div>
            </div>
          </div>

          {error && (
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

          <div className="rt-fade rt-card">
            <div className="rt-card-body">
              {pendingUsers.length === 0 ? (
                <EmptyState icon={UserPlus} title="No pending approvals" description="All users have been approved" />
              ) : (
                <DataTable columns={columns} data={pendingUsers} pageSize={10} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
