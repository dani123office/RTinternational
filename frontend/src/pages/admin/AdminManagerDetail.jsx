import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAdminStore } from '@/store/adminStore'
import {
  ArrowLeft, UserCog, Users, ArrowLeftRight,
  PoundSterling, TrendingUp, Mail,
} from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import DataTable from '@/components/shared/DataTable'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function AdminManagerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedManager, loadAdminManagerDetail, isLoading, error } = useAdminStore()

  useEffect(() => { if (id) loadAdminManagerDetail(Number(id)) }, [id, loadAdminManagerDetail])

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
            <Link to="/admin/managers" className="mt-4 text-indigo-600 text-sm font-medium inline-block">← Back to Managers</Link>
          </div>
        </div>
      </>
    )
  }

  const totalCallbacks = agents.reduce((s, a) => s + (a.callbacks || 0), 0)
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

          <div className="rt-page-header">
            <Link to="/admin/managers" className="flex items-center gap-1.5 text-sm text-slate-500 no-underline hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} /> Back to Managers
            </Link>
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
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: manager.isActive ? '#d1fae5' : '#fee2e2', color: manager.isActive ? '#065f46' : '#991b1b' }}>
                  {manager.isActive ? 'Active' : 'Disabled'}
                </span>
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
    </>
  )
}
