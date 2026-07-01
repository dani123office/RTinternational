import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Mail, Phone, MapPin, FileText, PhoneCall, Trash2 } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import { useToast } from '@/components/ui/toastContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  const navigate = useNavigate()
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/api/callbacks/${id}`)
      toast('Callback deleted', 'success')
      navigate('/admin/callbacks', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || err.message || 'Failed to delete callback'
      toast(msg, 'error')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

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
          <a href="/admin/callbacks" className="mt-4 text-indigo-600 text-sm font-medium inline-block">← Back to Callbacks</a>
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
          <div onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 no-underline mb-4 hover:text-slate-800 transition-colors" style={{ cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Back to Callbacks
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



          <div className="rt-fade mt-4">
            <OfferedRatesCard transfer={cb} />
          </div>

          <div className="rt-actions mt-6">
            <button onClick={() => setShowDelete(true)} className="rt-btn-danger">
              <Trash2 size={16} /> Delete Callback
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showDelete} onOpenChange={(o) => !o && setShowDelete(false)}>
        <DialogContent className="max-w-sm w-full">
          <DialogClose onClose={() => setShowDelete(false)} />
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
              <Trash2 size={22} color="#ef4444" />
            </div>
            <DialogTitle className="text-lg text-center">Delete Callback?</DialogTitle>
            <DialogDescription className="text-center text-slate-500">
              This action cannot be undone. All associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
