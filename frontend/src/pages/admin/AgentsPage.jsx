import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import { Users, Plus, Ban, Trash2, UserRoundCog, AlertTriangle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import CreateAgentModal from '@/components/admin/CreateAgentModal'
import AssignManagerModal from '@/components/admin/AssignManagerModal'
import ResetPasswordModal from '@/components/admin/ResetPasswordModal'

export default function AgentsPage() {
  const navigate = useNavigate()
  const { agents, managers, loadAgents, loadManagers, createAgent, assignAgent, updateUser, deleteUser, resetUserPassword } = useAdminStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showAssign, setShowAssign] = useState(null)
  const [showResetPwd, setShowResetPwd] = useState(null)
  const search = ''
  const [showDeactivated, setShowDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadAgents(showDeactivated), loadManagers()]).then(() => setLoading(false))
  }, [loadAgents, loadManagers, showDeactivated])

  const noManagers = !managers || managers.length === 0
  const filtered = agents.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.name.toLowerCase().includes(q) || (a.managerName || '').toLowerCase().includes(q)
  })

  const handleCreate = async (data) => {
    await createAgent(data)
    await loadAgents(showDeactivated)
  }

  const handleAssign = async (agentId, managerId) => {
    await assignAgent(agentId, managerId)
    await loadAgents(showDeactivated)
  }

  const handleToggleActive = async (agent) => {
    await updateUser(agent.id, { isActive: agent.isActive ? 0 : 1 }, showDeactivated)
  }

  const handleDelete = async (agent) => {
    if (!confirm(`Permanently delete ${agent.name}? This cannot be undone.`)) return
    try {
      await deleteUser(agent.id, showDeactivated)
    } catch (e) {
      alert(e.response?.data?.detail || 'Cannot delete agent')
    }
  }

  const columns = [
    { header: 'Name', cell: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
    { header: 'Manager', cell: (row) => row.managerName || <span className="text-amber-600">Unassigned</span> },
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
    {
      header: 'Status',
      cell: (row) => {
        const bg = row.isActive ? '#d1fae5' : '#fee2e2'
        const color = row.isActive ? '#065f46' : '#991b1b'
        return <span style={{ padding: '2px 8px', borderRadius: '6px', background: bg, color, fontWeight: 600, fontSize: '0.72rem' }}>{row.isActive ? 'Active' : 'Disabled'}</span>
      },
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowResetPwd(row)} title="Reset password" className="p-1.5 rounded-lg border-none bg-transparent text-amber-500 cursor-pointer hover:bg-amber-50 transition-colors">
            <KeyRound size={14} />
          </button>
          <button onClick={() => setShowAssign(row)} title="Assign manager" className="p-1.5 rounded-lg border-none bg-transparent text-indigo-500 cursor-pointer hover:bg-indigo-50 transition-colors">
            <UserRoundCog size={14} />
          </button>
          <button onClick={() => handleToggleActive(row)} title="Toggle active" className="p-1.5 rounded-lg border-none bg-transparent text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors">
            <Ban size={14} />
          </button>
          <button onClick={() => handleDelete(row)} title="Delete" className="p-1.5 rounded-lg border-none bg-transparent text-red-500 cursor-pointer hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  if (loading) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page"><LoadingSpinner size={32} text="Loading agents..." /></div>
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
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <Users size={20} color="#6366f1" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Agents</h1>
                  <p className="text-sm text-slate-400 mt-0.5">{agents.length} total</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowDeactivated(!showDeactivated)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 border ${showDeactivated ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  {showDeactivated ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showDeactivated ? 'Hide Disabled' : 'Show Disabled'}
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  disabled={noManagers}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 border-none text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: noManagers ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
                    boxShadow: noManagers ? 'none' : '0 4px 18px rgba(99,102,241,0.35)',
                  }}
                  title={noManagers ? 'Create a manager first' : 'Create Agent'}
                >
                  <Plus size={15} /> Create Agent
                </button>
              </div>
            </div>
          </div>

          {noManagers && (
            <div className="rt-fade rt-d1 flex items-center gap-2 p-3 rounded-xl mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem' }}>
              <AlertTriangle size={16} color="#d97706" />
              <span>Please create a manager first before creating agents</span>
            </div>
          )}

          <div className="rt-fade rt-d2 rt-card">
            <div className="rt-card-body">
              {filtered.length === 0 ? (
                <EmptyState icon={Users} title="No agents found" description={search ? 'Try a different search' : 'Create your first agent'} />
              ) : (
                <DataTable
                  columns={columns}
                  data={filtered}
                  searchKey="name"
                  pageSize={10}
                  onRowClick={(row) => navigate(`/admin/agents/${row.id}`)}
                />
              )}
            </div>
          </div>

          <CreateAgentModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            onSave={handleCreate}
            managers={managers}
          />
          <AssignManagerModal
            isOpen={!!showAssign}
            onClose={() => setShowAssign(null)}
            onSave={handleAssign}
            agent={showAssign}
            managers={managers}
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
