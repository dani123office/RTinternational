import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, FileText, Banknote, Calendar } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import { formatPaymentMethod } from '@/lib/formatters'
import StatusBadge from '@/components/shared/StatusBadge'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

function Field({ label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase w-36 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-slate-700">{children || <span className="text-slate-300">—</span>}</div>
    </div>
  )
}

export default function AdminSaleDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const agentId = location.state?.agentId
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`${endpoints.sales}/${id}`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(err.response?.data?.detail || 'Failed to load sale'); setLoading(false) })
  }, [id])

  if (loading) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page"><LoadingSpinner size={32} text="Loading sale..." /></div>
    </>
  )

  if (error) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div className="rt-card p-10 text-center">
          <p className="text-slate-400 text-sm">{error}</p>
          <Link to={agentId ? `/admin/agents/${agentId}` : "/admin/agents"} className="mt-4 text-indigo-600 text-sm font-medium inline-block">← Back to Agent</Link>
        </div>
      </div>
    </>
  )

  const s = data
  const c = s.customer

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div onClick={() => navigate(agentId ? `/admin/agents/${agentId}` : "/admin/agents", { replace: true })} className="flex items-center gap-1.5 text-sm text-slate-500 no-underline mb-4 hover:text-slate-800 transition-colors" style={{ cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Back to Agent
          </div>

          <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white p-6 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={s.cotStatus} type="sale" />
              </div>
              <h1 className="text-2xl font-bold">{s.ownerFullName || c?.businessName || 'Sale'}</h1>
              <p className="text-amber-200 text-sm mt-1">{c?.businessName || ''}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-200">#{s.id}</p>
              <p className="text-xs text-amber-200 mt-1">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : ''}</p>
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
              <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><Banknote size={15} /></div><span className="rt-card-title">Sale Details</span></div></div>
              <div className="rt-card-body">
                <Field label="Agent">{s.agentName}</Field>
                <Field label="Status"><StatusBadge status={s.cotStatus} type="sale" /></Field>
                <Field label="Owner Name">{s.ownerFullName}</Field>
                <Field label="Home Address">{s.homeAddress}</Field>
                <Field label="DOB">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-GB') : ''}</Field>
                <Field label="Business Type">{s.businessType}</Field>
                <Field label="Bill Frequency">{s.billFrequency}</Field>
                <Field label="Payment Method">{formatPaymentMethod(s.paymentMethod)}</Field>
                <Field label="COT Date">{s.cotDate ? new Date(s.cotDate).toLocaleDateString('en-GB') : ''}</Field>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="rt-card rt-fade">
              <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><Banknote size={15} /></div><span className="rt-card-title">Bank Details</span></div></div>
              <div className="rt-card-body">
                <Field label="Bank">{s.bankName}</Field>
                <Field label="Account Type">{s.accountType}</Field>
                <Field label="Account Title">{s.accountTitle}</Field>
                <Field label="Sort Code">{s.sortCode}</Field>
                <Field label="Account No.">{s.bankAccountNumber}</Field>
              </div>
            </div>

            {s.notes && (
              <div className="rt-card rt-fade">
                <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><FileText size={15} /></div><span className="rt-card-title">Notes</span></div></div>
                <div className="rt-card-body">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{s.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
