import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, Clock } from 'lucide-react'
import api, { endpoints, extractData } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'

export default function AdminTransfers() {
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(endpoints.admin.transfers)
      .then(res => { setTransfers(extractData(res)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>All Transfers</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>View transfers across all agents</p>
          </div>

          {transfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ArrowLeftRight size={20} color="#22c55e" opacity={0.5} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No transfers found</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No transfers across all agents.</p>
            </div>
          ) : (
            <div className="rt-section-gap">
              {transfers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/admin/transfers/${t.id}`, { state: { agentId: t.employeeId } })}
                  className="rt-card-flat"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                      <ArrowLeftRight size={16} color="#22c55e" />
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '14px', margin: 0, textTransform: 'capitalize' }}>
                        {t.customer?.businessName || t.ownerFullName || 'Unknown'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0', textTransform: 'capitalize' }}>
                        {t.customer?.ownerName ? `Owner: ${t.customer.ownerName}` : t.notes?.slice(0, 60) || ''}
                        {t.agentName && <span> &middot; {t.agentName}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', textTransform: 'capitalize' }}>
                      {t.utilityType || 'N/A'}
                    </span>
                    <StatusBadge status={t.status} type="transfer" />
                    <ArrowRight size={14} style={{ color: '#d1d5db' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
