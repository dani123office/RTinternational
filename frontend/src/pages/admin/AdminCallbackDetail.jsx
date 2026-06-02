import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Mail, Phone, MapPin, FileText, PhoneCall } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import MeterDetailsCard from '@/components/shared/MeterDetailsCard'
import AccountDetailsCard from '@/components/shared/AccountDetailsCard'
import OfferedRatesCard from '@/components/shared/OfferedRatesCard'

function Field({ label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase w-36 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-slate-700">{children || <span className="text-slate-300">—</span>}</div>
    </div>
  )
}

export default function AdminCallbackDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const agentId = location.state?.agentId
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(endpoints.admin.callbackDetail(id))
        setData(res.data)
      } catch (err) {
        // fallback to public endpoint
        try {
          const res2 = await api.get(`/api/callbacks/${id}`)
          setData(res2.data)
        } catch (err2) {
          setError(err2.response?.data?.detail || 'Failed to load callback')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page"><LoadingSpinner size={32} text="Loading callback..." /></div>
    </>
  )

  if (error) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div className="rt-card p-10 text-center">
          <p className="text-slate-400 text-sm">{error}</p>
          <a href={agentId ? `/admin/agents/${agentId}` : "/admin/agents"} className="mt-4 text-indigo-600 text-sm font-medium inline-block">← Back to Agent</a>
        </div>
      </div>
    </>
  )

  const cb = data
  const c = cb.customer

  const hasElectricity = c?.electricityMeters?.length > 0
  const hasGas = c?.gasMeters?.length > 0

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div onClick={() => navigate(agentId ? `/admin/agents/${agentId}` : "/admin/agents", { replace: true })} className="flex items-center gap-1.5 text-sm text-slate-500 no-underline mb-4 hover:text-slate-800 transition-colors" style={{ cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Back to Agent
          </div>

          <div className="bg-gradient-to-r from-teal-600 to-emerald-500 text-white p-6 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={cb.status} type="callback" />
                {cb.priority && (
                  <span className="text-xs font-semibold rounded-full px-3 py-1 bg-white/20 capitalize">{cb.priority}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{c?.businessName || cb.ownerName || 'Callback'}</h1>
              <p className="text-teal-200 text-sm mt-1">{c?.ownerName || ''}</p>
              {cb.scheduledDateTime && (
                <div className="flex items-center gap-4 mt-3 text-sm text-teal-200 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(cb.scheduledDateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {new Date(cb.scheduledDateTime).toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-teal-200">#{cb.id}</p>
              <p className="text-xs text-teal-200 mt-1">{cb.createdAt ? new Date(cb.createdAt).toLocaleDateString('en-GB') : ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="rt-card rt-fade">
              <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><FileText size={15} /></div><span className="rt-card-title">Customer Info</span></div></div>
              <div className="rt-card-body">
                {c ? (
                  <>
                    <Field label="Business">{c.businessName}</Field>
                    <Field label="Owner">{c.ownerName}</Field>
                    <Field label="Business Phone"><span className="flex items-center gap-1"><Phone size={12} /> {c.businessPhone}</span></Field>
                    <Field label="Owner Phone">{c.ownerPhone}</Field>
                    <Field label="Email"><span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span></Field>
                    <Field label="Address"><span className="flex items-center gap-1"><MapPin size={12} /> {c.businessAddress}</span></Field>
                    <Field label="Postcode">{c.postcode}</Field>
                  </>
                ) : <p className="text-slate-400 text-sm">No customer data</p>}
              </div>
            </div>

            <div className="rt-card rt-fade">
              <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><PhoneCall size={15} /></div><span className="rt-card-title">Callback Details</span></div></div>
              <div className="rt-card-body">
                <Field label="Agent">{cb.agentName}</Field>
                <Field label="Status"><StatusBadge status={cb.status} type="callback" /></Field>
                <Field label="Priority">{cb.priority}</Field>
                <Field label="Notes">{cb.notes}</Field>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {(cb.accountNumber || cb.mpan || cb.mprn || cb.msn) && (
              <div className="rt-card rt-fade">
                <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><FileText size={15} /></div><span className="rt-card-title">Account Details</span></div></div>
                <div className="rt-card-body">
                  <Field label="Account No.">{cb.accountNumber}</Field>
                  <Field label="MPAN">{cb.mpan}</Field>
                  <Field label="MPRN">{cb.mprn}</Field>
                  <Field label="Meter Serial">{cb.msn}</Field>
                </div>
              </div>
            )}

            {cb.notes && (
              <div className="rt-card rt-fade">
                <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><FileText size={15} /></div><span className="rt-card-title">Notes</span></div></div>
                <div className="rt-card-body">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{cb.notes}</p>
                </div>
              </div>
            )}
          </div>

          {hasElectricity && (
            <div className="rt-fade mt-4">
              <MeterDetailsCard utilityType="electricity" meters={c.electricityMeters} />
            </div>
          )}

          {hasGas && (
            <div className="rt-fade mt-4">
              <MeterDetailsCard utilityType="gas" meters={c.gasMeters} />
            </div>
          )}

          {(cb.accountNumber || cb.mpan || cb.mprn || cb.msn) && (
            <div className="rt-fade mt-4">
              <AccountDetailsCard transfer={cb} />
            </div>
          )}

          <div className="rt-fade mt-4">
            <OfferedRatesCard transfer={cb} />
          </div>
        </div>
      </div>
    </>
  )
}
