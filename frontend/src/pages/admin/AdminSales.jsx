import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PoundSterling, ArrowRight } from 'lucide-react'
import api, { endpoints, extractData } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'

export default function AdminSales() {
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(endpoints.admin.sales)
      .then(res => { setSales(extractData(res)); setLoading(false) })
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
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>All Sales</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>View sales across all agents</p>
          </div>

          {sales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <PoundSterling size={20} color="#f59e0b" opacity={0.5} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No sales found</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No sales across all agents.</p>
            </div>
          ) : (
            <div className="rt-section-gap">
              {sales.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/admin/sales/${s.id}`, { state: { agentId: s.agentId } })}
                  className="rt-card-flat"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
                      <PoundSterling size={16} color="#f59e0b" />
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: '#0f172a', fontWeight: 600, fontSize: '14px', margin: 0, textTransform: 'capitalize' }}>
                        {s.customer?.businessName || s.ownerFullName || 'Unknown'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0', textTransform: 'capitalize' }}>
                        {s.customer?.ownerName ? `Owner: ${s.customer.ownerName}` : s.notes?.slice(0, 60) || ''}
                        {s.agentName && <span> &middot; {s.agentName}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <StatusBadge status={s.cotStatus || s.status} type="sale" />
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
