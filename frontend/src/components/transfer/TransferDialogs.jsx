import { useState } from 'react'
import { Calendar, PhoneCall, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function TransferDialogs({
  transfer,
  showReschedule, setShowReschedule,
  showScheduleCallback, setShowScheduleCallback,
  showDelete, setShowDelete,
  onReschedule,
  onScheduleCallback,
  onDelete,
  showNotInterested, setShowNotInterested,
  notInterestedReason, setNotInterestedReason,
  onConfirmNotInterested,
}) {
  const [rescheduleDate, setRescheduleDate] = useState(() => transfer?.scheduledDateTime?.substring(0, 10) || '')
  const [rescheduleTime, setRescheduleTime] = useState(() => transfer?.scheduledDateTime?.substring(11, 16) || '10:00')
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('10:00')

  return (
    <>
      <Dialog open={showReschedule} onOpenChange={(o) => !o && setShowReschedule(false)}>
        <DialogContent>
          <DialogClose onClose={() => setShowReschedule(false)} />

          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Reschedule Transfer
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Set a new date and window time for follow-up.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5 pr-0">
            <Button variant="ghost" onClick={() => setShowReschedule(false)} className="rounded-xl px-5">
              Cancel
            </Button>
            <Button onClick={() => onReschedule(rescheduleDate, rescheduleTime)} className="rounded-xl px-5 whitespace-nowrap">
              <Calendar className="h-4 w-4" /> Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleCallback} onOpenChange={(o) => !o && setShowScheduleCallback(false)}>
        <DialogContent>
          <DialogClose onClose={() => setShowScheduleCallback(false)} />

          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Schedule as Callback
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Create a callback from this transfer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                <input
                  type="date"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</label>
                <input
                  type="time"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5 pr-0">
            <Button variant="ghost" onClick={() => setShowScheduleCallback(false)} className="rounded-xl px-5">
              Cancel
            </Button>
            <Button onClick={() => onScheduleCallback(callbackDate, callbackTime)} className="rounded-xl px-5 whitespace-nowrap">
              <PhoneCall className="h-4 w-4" /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotInterested} onOpenChange={(o) => !o && setShowNotInterested(false)}>
        <DialogContent>
          <DialogClose onClose={() => { setShowNotInterested(false); setNotInterestedReason('') }} />

          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Mark as Not Interested
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Please provide a reason for marking this transfer as not interested.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <textarea
                value={notInterestedReason}
                onChange={(e) => setNotInterestedReason(e.target.value)}
                placeholder="Enter reason..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <DialogFooter className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5 pr-0">
            <Button variant="ghost" onClick={() => { setShowNotInterested(false); setNotInterestedReason('') }} className="rounded-xl px-5">
              Cancel
            </Button>
            <Button onClick={onConfirmNotInterested} className="rounded-xl px-5 whitespace-nowrap">
              Confirm
            </Button>
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
            <Button variant="outline" onClick={() => setShowDelete(false)} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} className="rounded-xl px-6">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
