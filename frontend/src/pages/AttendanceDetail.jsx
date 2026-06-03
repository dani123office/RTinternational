import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, LogIn, LogOut, AlertTriangle, CheckCircle, XCircle, Mail, User } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'

function DetailRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      {Icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color || '#6366f1'}15` }}>
          <Icon size={14} color={color || '#6366f1'} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-slate-900 mt-0.5" style={{ color: value === '-' ? '#94a3b8' : undefined }}>{value}</p>
      </div>
    </div>
  )
}

export default function AttendanceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(endpoints.attendance.record(id))
        setData(res.data)
      } catch {} finally { setLoading(false) }
    })()
  }, [id])

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '24px' }}>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-transparent border-none cursor-pointer mb-3 transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h1 className="rt-page-title">Attendance Record</h1>
          </div>

          {loading ? (
            <div className="rt-card rt-fade">
              <div className="rt-card-body">
                <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
              </div>
            </div>
          ) : !data ? (
            <div className="rt-card rt-fade">
              <div className="rt-card-body">
                <p className="text-sm text-slate-400 text-center py-8">Record not found.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div className={`rt-fade rounded-2xl p-5 mb-5 flex items-center gap-4`} style={{
                background: data.record.status === 'late' ? '#fef2f2' : '#f0fdf4',
                border: data.record.status === 'late' ? '1px solid #fecaca' : '1px solid #bbf7d0',
              }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: data.record.status === 'late' ? '#fee2e2' : '#dcfce7',
                }}>
                  {data.record.status === 'late' ? <AlertTriangle size={20} color="#dc2626" /> : <CheckCircle size={20} color="#16a34a" />}
                </div>
                <div>
                  <p className="text-sm font-extrabold" style={{ color: data.record.status === 'late' ? '#7f1d1d' : '#166534' }}>
                    {data.record.status === 'late' ? 'Late Arrival' : 'On Time'}
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: data.record.status === 'late' ? '#b91c1c' : '#15803d' }}>
                    {new Date(data.record.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Agent Info */}
                <div className="rt-card rt-fade rt-d1">
                  <div className="rt-card-header">
                    <div className="rt-card-header-left">
                      <div className="rt-card-icon" style={{ background: '#eef2ff' }}>
                        <User size={16} color="#6366f1" />
                      </div>
                      <span className="rt-card-title">Agent</span>
                    </div>
                  </div>
                  <div className="rt-card-body">
                    <DetailRow icon={User} label="Name" value={data.agentName} color="#6366f1" />
                    <DetailRow icon={Mail} label="Email" value={data.agentEmail} color="#64748b" />
                  </div>
                </div>

                {/* Times */}
                <div className="rt-card rt-fade rt-d2">
                  <div className="rt-card-header">
                    <div className="rt-card-header-left">
                      <div className="rt-card-icon" style={{ background: '#f5f3ff' }}>
                        <Clock size={16} color="#8b5cf6" />
                      </div>
                      <span className="rt-card-title">Timeline</span>
                    </div>
                  </div>
                  <div className="rt-card-body">
                    <DetailRow
                      icon={LogIn}
                      label="Check In"
                      value={data.record.checkIn
                        ? new Date(data.record.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : '-'}
                      color="#16a34a"
                    />
                    <DetailRow
                      icon={LogOut}
                      label="Check Out"
                      value={data.record.checkOut
                        ? new Date(data.record.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : 'Not checked out'}
                      color="#dc2626"
                    />
                    <DetailRow
                      icon={Clock}
                      label="Duration"
                      value={data.record.checkIn && data.record.checkOut
                        ? (() => {
                            const diff = new Date(data.record.checkOut) - new Date(data.record.checkIn)
                            const h = Math.floor(diff / 3600000)
                            const m = Math.floor((diff % 3600000) / 60000)
                            return `${h}h ${m}m`
                          })()
                        : data.record.checkIn ? 'Still active' : '-'}
                      color="#8b5cf6"
                    />
                  </div>
                </div>
              </div>

              {/* Reasons */}
              <div className="rt-card rt-fade rt-d3" style={{ marginTop: '20px' }}>
                <div className="rt-card-header">
                  <div className="rt-card-header-left">
                    <div className="rt-card-icon" style={{ background: '#fffbeb' }}>
                      <XCircle size={16} color="#d97706" />
                    </div>
                    <span className="rt-card-title">Notes</span>
                  </div>
                </div>
                <div className="rt-card-body">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Check-in Reason</p>
                      <p className="text-sm text-slate-700">{data.record.checkin_reason || 'No reason provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Check-out Reason</p>
                      <p className="text-sm text-slate-700">{data.record.checkout_reason || 'No reason provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
