import { useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CallbackDialogs({
  callback,
  showReschedule, setShowReschedule,
  rescheduleDate, setRescheduleDate,
  rescheduleTime, setRescheduleTime,
  onReschedule,
  showNotInterested, setShowNotInterested,
  notInterestedReason, setNotInterestedReason,
  onConfirmNotInterested
}) {

  useEffect(() => {
    if (showReschedule && callback?.scheduledDateTime) {
      setRescheduleDate(callback.scheduledDateTime.substring(0, 10))
      setRescheduleTime(callback.scheduledDateTime.substring(11, 16))
    }
  }, [showReschedule, callback, setRescheduleDate, setRescheduleTime])

  return (
    <>
    <Dialog open={showReschedule} onOpenChange={(o) => !o && setShowReschedule(false)}>
      <DialogContent>
        <DialogClose onClose={() => setShowReschedule(false)} />

        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Reschedule Callback
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            Set a new date and window time for future outreach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-300"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</Label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-5 pr-0">
          <Button variant="ghost" onClick={() => setShowReschedule(false)} className="rounded-xl px-5">
            Cancel
          </Button>
          <Button onClick={onReschedule} className="rounded-xl px-5 whitespace-nowrap">
            <Calendar className="h-4 w-4" /> Save Date
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Not Interested Dialog */}
    <Dialog open={showNotInterested} onOpenChange={(o) => !o && setShowNotInterested(false)}>
      <DialogContent>
        <DialogClose onClose={() => { setShowNotInterested(false); setNotInterestedReason('') }} />

        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Mark as Not Interested
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            Please provide a reason for marking this callback as not interested.
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
    </>
  )
}
