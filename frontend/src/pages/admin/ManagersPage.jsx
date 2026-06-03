import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import { UserCog, Plus, Ban, Trash2, KeyRound } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import CreateManagerModal from '@/components/admin/CreateManagerModal'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'

export default function ManagersPage() {
  const navigate = useNavigate()
  const { managers, loadManagers, createManager, updateUser, deleteUser, resetUserPassword } = useAdminStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showResetPwd, setShowResetPwd] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadManagers().then(() => setLoading(false))
  }, [loadManagers])

  const handleCreate = async (data) => {
    await createManager(data)
    await loadManagers()
  }

  const handleToggleActive = async (manager) => {
    await updateUser(manager.id, { isActive: manager.isActive ? 0 : 1 })
    await loadManagers()
  }

  const handleDelete = async (manager) => {
    if (!confirm(`Deactivate ${manager.name}? This will fail if they have agents assigned.`)) return
    try {
      await deleteUser(manager.id)
      await loadManagers()
    } catch (e) {
      alert(e.response?.data?.detail || 'Cannot delete manager')
    }
  }

  const columns = [
    { header: 'Name', cell: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
    {
      header: 'Team Size',
      cell: (row) => <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#eef2ff', color: '#6366f1', fontWeight: 600, fontSize: '0.78rem' }}>{row.teamSize}</span>,
    },
    { header: 'Callbacks', accessor: 'callbacks' },
    { header: 'Transfers', accessor: 'transfers' },
    { header: 'Sales', accessor: 'sales' },
    {
      header: 'Conversion',
      cell: (row) => {
        const bg = row.conversionRate > 20 ? '#d1fae5' : '#fef3c7'
        const color = row.conversionRate > 20 ? '#065f46' : '#92400e'
        return <span style={{ padding: '2px 8px', borderRadius: '6px', background: bg, color, fontWeight: 600, fontSize: '0.78rem' }}>{row.conversionRate}%</span>
      },
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <span className="rt-tooltip-wrap">
            <button onClick={() => setShowResetPwd(row)} className="p-1.5 rounded-lg border-none bg-transparent text-amber-500 cursor-pointer hover:bg-amber-50 transition-colors">
              <KeyRound size={14} />
            </button>
            <span className="rt-tooltip">Reset password</span>
          </span>
          <span className="rt-tooltip-wrap">
            <button onClick={() => handleToggleActive(row)} className="p-1.5 rounded-lg border-none bg-transparent text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors">
              <Ban size={14} />
            </button>
            <span className="rt-tooltip">{row.isActive ? 'Deactivate' : 'Activate'}</span>
          </span>
          <span className="rt-tooltip-wrap">
            <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg border-none bg-transparent text-red-500 cursor-pointer hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
            <span className="rt-tooltip">Delete manager</span>
          </span>
        </div>
      ),
    },
  ]

  if (loading) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page"><LoadingSpinner size={32} text="Loading managers..." /></div>
    </>
  )

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          <div className="rt-fade" style={{ marginBottom: '28px' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: '#f5f3ff' }}>
                  <UserCog size={20} color="#8b5cf6" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Managers</h1>
                  <p className="text-sm text-slate-400 mt-0.5">{managers.length} total</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 border-none text-white"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  boxShadow: '0 4px 18px rgba(139,92,246,0.35)',
                }}
              >
                <Plus size={15} /> Create Manager
              </button>
            </div>
          </div>

          <div className="rt-fade rt-d1 rt-card">
            <div className="rt-card-body">
              {managers.length === 0 ? (
                <EmptyState icon={UserCog} title="No managers yet" description="Create your first manager to get started" />
              ) : (
                <DataTable
                  columns={columns}
                  data={managers}
                  searchKey="name"
                  pageSize={10}
                  onRowClick={(row) => navigate(`/admin/managers/${row.id}`)}
                />
              )}
            </div>
          </div>

          <CreateManagerModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            onSave={handleCreate}
          />
          <ResetPasswordModal
            isOpen={!!showResetPwd}
            onClose={() => setShowResetPwd(null)}
            onSave={resetUserPassword}
            user={showResetPwd}
          />
        </div>
      </div>
    </>
  )
}
