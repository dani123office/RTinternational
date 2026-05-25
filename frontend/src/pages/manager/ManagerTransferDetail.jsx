import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, FileText } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'
import { useManagerStore } from '@/store/managerStore'
import { useToast } from '@/components/ui/toastContext'
import TransferHero from '@/components/transfer/TransferHero'
import CustomerInfoCard from '@/components/shared/CustomerInfoCard'
import AccountDetailsCard from '@/components/shared/AccountDetailsCard'
import MeterDetailsCard from '@/components/shared/MeterDetailsCard'
import OfferedRatesCard from '@/components/shared/OfferedRatesCard'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar, PhoneCall, Trash2, Edit3 } from 'lucide-react'
import api from '@/lib/api'

function Card({ icon: Icon, iconColor, iconBg, title, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay || ''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon" style={{background: iconBg || 'rgba(99,102,241,0.15)'}}>
            <Icon size={16} color={iconColor || '#6366f1'} />
          </div>
          <span className="rt-card-title">{title}</span>
        </div>
      </div>
      <div className="rt-card-body">{children}</div>
    </div>
  )
}

export default function ManagerTransferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { transfers, callbacks, agents, updateTransfer, deleteTransfer, createCallback, loadTransfers, loadCallbacks, loadAgents } = useManagerStore()

  const [localTransfer, setLocalTransfer] = useState(null)
  const [localCallback, setLocalCallback] = useState(null)

  const transferId = Number(id)

  useEffect(() => {
    loadTransfers()
    loadAgents()
  }, [loadTransfers, loadAgents])

  useEffect(() => {
    let isMounted = true
    const loadTransfer = async () => {
      const found = transfers.find((t) => t.id === transferId)
      if (found) {
        setLocalTransfer(found)
      }

      try {
        const res = await api.get(`/api/transfers/${transferId}`)
        if (!isMounted) return
        const t = res.data
        setLocalTransfer(t)
        if (t.callBackId) {
          const cbRes = await api.get(`/api/callbacks/${t.callBackId}`)
          if (isMounted) {
            setLocalCallback(cbRes.data)
          }
        }
      } catch (err) {
        console.error('Failed to load transfer:', err)
      }
    }

    loadTransfer()
    return () => {
      isMounted = false
    }
  }, [transferId, transfers])

  const [showReschedule, setShowReschedule] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('10:00')
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('10:00')

  const transfer = localTransfer
  const linkedCallback = localCallback || callbacks.find((c) => c.id === transfer?.callBackId)
  const agent = useMemo(() => agents?.find((a) => a.id === transfer?.employeeId), [agents, transfer])
  const agentName = transfer?.agentName || agent?.name || 'Unknown Agent'


  const handleDelete = async () => {
    try {
      await deleteTransfer(transferId)
      toast('Transfer deleted', 'success')
      navigate('/manager/transfers')
    } catch {
      toast('Failed to delete transfer', 'error')
    }
  }

  const handleMarkAsSale = () => {
    if (!transfer) return
    navigate('/sales/apply', {
      state: { fromTransfer: true, transferId: transfer.id, customerId: transfer.customerId, prefillData: transfer }
    })
  }

  const handleReschedule = async () => {
    if (!rescheduleDate) return
    try {
      const updated = await updateTransfer(transferId, { scheduledDateTime: `${rescheduleDate}T${rescheduleTime}:00` })
      toast('Transfer rescheduled', 'success')
      setShowReschedule(false)
      if (updated) setLocalTransfer(updated)
      loadTransfers()
    } catch {
      toast('Failed to reschedule', 'error')
    }
  }

  const openScheduleCallback = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setCallbackDate(tomorrow.toISOString().split('T')[0])
    setCallbackTime('10:00')
    setShowSchedule(true)
  }

  const handleScheduleAsCallback = async (date, time) => {
    if (!transfer) return
    if (!date) {
      toast('Please choose a date for the callback', 'error')
      return
    }
    try {
      const payload = {
        customerId: transfer.customerId,
        employeeId: transfer.employeeId,
        scheduledDateTime: `${date}T${time || '10:00'}:00`,
        notes: `Scheduled from Transfer #${transfer.id}`,
        transferId: transfer.id,
      }
      console.log('Callback payload:', JSON.stringify(payload))
      await createCallback(payload)
      toast('Callback scheduled', 'success')
      setShowSchedule(false)
      loadTransfers()
      loadCallbacks()
    } catch (err) {
      console.error('Schedule callback error:', err)
      const fullResp = err?.response?.request?.responseText || err?.response?.data
      const msg = typeof fullResp === 'object' ? JSON.stringify(fullResp, null, 2) : (String(fullResp || err?.message || err || 'Failed'))
      console.error('Full response:', msg)
      toast(msg.substring(0, 300), 'error')
    }
  }

  if (!transfer) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="rt-card" style={{ padding: '40px' }}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 rt-spin" color="#6366f1" />
                <p className="text-sm text-gray-500 font-medium">Loading transfer...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const customer = transfer.customer || {}

  // Ensure the electricity meter card shows the same MPAN as the transfer (or linked callback)
  const preferredMpAN = transfer?.mpan || linkedCallback?.mpan || customer?.electricityMeters?.[0]?.supplyNumber
  const displayedElectricityMeters = preferredMpAN && customer?.electricityMeters && customer.electricityMeters.length > 0
    ? customer.electricityMeters.map((m, i) => ({ ...m, supplyNumber: i === 0 ? preferredMpAN : m.supplyNumber }))
    : customer?.electricityMeters || []

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{maxWidth:'960px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'16px'}}>

          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'4px'}}>
            <button className="rt-back-btn" onClick={() => navigate('/manager/transfers')}>
              <ArrowLeft size={17}/>
            </button>
          </div>

          <div className="rt-fade rt-d1">
            <TransferHero transfer={transfer} customer={customer} />
          </div>

          <div className="rt-fade rt-d2">
            <CustomerInfoCard customer={customer} agentName={agentName} />
          </div>

          <Card icon={FileText} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title="Broker Notes" delay="rt-d2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transfer.notes ? (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Transfer Notes</span>
                  <p style={{color:'#334155',fontSize:'13.5px',whiteSpace:'pre-wrap',lineHeight:1.7,margin:0}}>{transfer.notes}</p>
                </div>
              ) : null}
              {linkedCallback?.notes ? (
                <div style={transfer.notes ? { borderTop: '1px solid #f1f5f9', paddingTop: '12px' } : {}}>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Original Callback Notes</span>
                  <p style={{color:'#334155',fontSize:'13.5px',whiteSpace:'pre-wrap',lineHeight:1.7,margin:0}}>{linkedCallback.notes}</p>
                </div>
              ) : null}
              {!transfer.notes && !linkedCallback?.notes && (
                <p style={{color:'#94a3b8',fontSize:'13.5px',fontStyle:'italic',margin:0}}>No notes have been added for this transfer.</p>
              )}
            </div>
          </Card>

          {transfer.accountNumber && (
            <div className="rt-fade rt-d3">
              <AccountDetailsCard transfer={transfer} />
            </div>
          )}

          <div className="rt-grid2">
            <div className="rt-fade rt-d3">
              <MeterDetailsCard utilityType="electricity" meters={displayedElectricityMeters} />
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div className="rt-fade rt-d4">
                <MeterDetailsCard utilityType="gas" meters={customer.gasMeters} />
              </div>
            </div>
          </div>



          <div className="rt-fade rt-d5">
            <OfferedRatesCard transfer={transfer} />
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setShowDelete(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                  backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6',
                  borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer'
                }}>
                <Trash2 size={16} /> Delete Record
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Status:</span>
                <select
                  value={transfer.status || 'pending'}
                  onChange={async (e) => {
                    const newStatus = e.target.value
                    try {
                      const updated = await updateTransfer(transfer.id, { status: newStatus })
                      toast('Status updated successfully', 'success')
                      if (updated) setLocalTransfer(updated)
                      loadTransfers()
                    } catch {
                      toast('Failed to update status', 'error')
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="dispute">Dispute</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="chasing">Chasing</option>
                  <option value="hold">On Hold</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <button type="button" onClick={openScheduleCallback}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                  backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1',
                  borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                <PhoneCall size={16} style={{ color: '#94a3b8' }} /> Schedule Callback
              </button>
              <button type="button" onClick={() => navigate(`/transfers/${transfer.id}/edit`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                  backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1',
                  borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                <Edit3 size={16} style={{ color: '#94a3b8' }} /> Edit Details
              </button>
              <button type="button" onClick={handleMarkAsSale}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  backgroundColor: '#4f46e5', color: '#ffffff', border: 'none',
                  borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
                }}>
                Mark as Sale
              </button>
            </div>
          </div>

          <Dialog open={showReschedule} onOpenChange={(o) => !o && setShowReschedule(false)}>
            <DialogContent>
              <DialogClose onClose={() => setShowReschedule(false)} />
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Reschedule Transfer</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Set a new date and window time for follow-up.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                    <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</label>
                    <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)}
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5 pr-0">
                <Button variant="ghost" onClick={() => setShowReschedule(false)} className="rounded-xl px-5">Cancel</Button>
                <Button onClick={handleReschedule} className="rounded-xl px-5 whitespace-nowrap"><Calendar className="h-4 w-4" /> Reschedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showSchedule} onOpenChange={(o) => !o && setShowSchedule(false)}>
            <DialogContent>
              <DialogClose onClose={() => setShowSchedule(false)} />
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Schedule Callback</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Select the callback date and time for this transfer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                    <input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)}
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</label>
                    <input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)}
                      className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5 pr-0">
                <Button variant="ghost" onClick={() => setShowSchedule(false)} className="rounded-xl px-5">Cancel</Button>
                <Button onClick={() => handleScheduleAsCallback(callbackDate, callbackTime)} className="rounded-xl px-5 whitespace-nowrap">Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showDelete} onOpenChange={(o) => !o && setShowDelete(false)}>
            <DialogContent className="max-w-sm">
              <DialogClose onClose={() => setShowDelete(false)} />
              <DialogHeader>
                <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                  <Trash2 size={22} color="#ef4444" />
                </div>
                <DialogTitle className="text-lg text-center">Delete Transfer?</DialogTitle>
                <DialogDescription className="text-center text-slate-500">
                  This action cannot be undone. The transfer and all associated data will be permanently removed.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowDelete(false)} className="rounded-xl px-6">Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} className="rounded-xl px-6">Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}
