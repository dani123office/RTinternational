import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, Mail, Phone, MapPin, FileText, Tag, Trash2 } from 'lucide-react'
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

export default function AdminTransferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get(`${endpoints.transfers}/${id}`)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(err => { setError(err.response?.data?.detail || 'Failed to load transfer'); setLoading(false) })
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`${endpoints.transfers}/${id}`)
      toast('Transfer deleted', 'success')
      navigate('/admin/transfers', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || err.message || 'Failed to delete transfer'
      toast(msg, 'error')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  if (loading) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page"><LoadingSpinner size={32} text="Loading transfer..." /></div>
    </>
  )

  if (error) return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div className="rt-card p-10 text-center">
          <p className="text-slate-400 text-sm">{error}</p>
          <Link to="/admin/transfers" className="mt-4 text-indigo-600 text-sm font-medium inline-block">← Back to Transfers</Link>
        </div>
      </div>
    </>
  )

  const t = data
  const c = t.customer

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div onClick={() => navigate('/admin/transfers', { replace: true })} className="flex items-center gap-1.5 text-sm text-slate-500 no-underline mb-4 hover:text-slate-800 transition-colors" style={{ cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Back to Transfers
          </div>

          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={t.status} type="transfer" />
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-white/20 capitalize">{t.utilityType}</span>
              </div>
              <h1 className="text-2xl font-bold">{c?.businessName || 'Transfer'}</h1>
              <p className="text-indigo-200 text-sm mt-1">{c?.ownerName || ''}</p>
              {t.scheduledDateTime && (
                <div className="flex items-center gap-4 mt-3 text-sm text-indigo-200 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(t.scheduledDateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {new Date(t.scheduledDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-indigo-200">#{t.id}</p>
              <p className="text-xs text-indigo-200 mt-1">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : ''}</p>
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
              <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><Tag size={15} /></div><span className="rt-card-title">Transfer Details</span></div></div>
              <div className="rt-card-body">
                <Field label="Agent">{t.agentName}</Field>
                <Field label="Status"><StatusBadge status={t.status} type="transfer" /></Field>
                <Field label="Outcome">{t.outcome}</Field>
                <Field label="Scheduled">{t.scheduledDateTime ? new Date(t.scheduledDateTime).toLocaleString('en-GB') : ''}</Field>
              </div>
            </div>
          </div>

          {(t.accountNumber || t.mpan || t.mprn || t.msn) && (
            <div className="rt-fade mt-4">
              <AccountDetailsCard transfer={t} />
            </div>
          )}

          {c?.electricityMeters?.length > 0 && (
            <div className="rt-fade mt-4">
              <MeterDetailsCard utilityType="electricity" meters={c.electricityMeters} />
            </div>
          )}

          {c?.gasMeters?.length > 0 && (
            <div className="rt-fade mt-4">
              <MeterDetailsCard utilityType="gas" meters={c.gasMeters} />
            </div>
          )}

          {t.notes && (
            <div className="rt-card rt-fade mt-4">
              <div className="rt-card-header"><div className="rt-card-header-left"><div className="rt-card-icon"><FileText size={15} /></div><span className="rt-card-title">Notes</span></div></div>
              <div className="rt-card-body">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.notes}</p>
              </div>
            </div>
          )}

          <div className="rt-fade mt-4">
            <OfferedRatesCard transfer={t} />
          </div>

          <div className="rt-actions mt-6">
            <button onClick={() => setShowDelete(true)} className="rt-btn-danger">
              <Trash2 size={16} /> Delete Transfer
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
            <DialogTitle className="text-lg text-center">Delete Transfer?</DialogTitle>
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
