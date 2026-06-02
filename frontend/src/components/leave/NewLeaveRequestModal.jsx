import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const LEAVE_TYPES = [
  'Sick Leave',
  'Annual Leave',
  'Personal Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Other',
]

export default function NewLeaveRequestModal({
  open,
  onOpenChange,
  onSubmit,
}) {
  const [leaveType, setLeaveType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate) return
    setSubmitting(true)
    try {
      await onSubmit({
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason || null,
      })
      setLeaveType('')
      setFromDate('')
      setToDate('')
      setReason('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setLeaveType('')
    setFromDate('')
    setToDate('')
    setReason('')
  }

  const canSubmit = leaveType && fromDate && toDate && fromDate <= toDate

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogClose onClose={handleClose} />

        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leave Type</Label>
            <Select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="" disabled>Select leave type</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">From Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-200 pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-200 pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the reason for your leave..."
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 hover:border-slate-400 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 pr-0">
          <Button variant="outline" onClick={handleClose} className="rounded-xl px-6">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} loading={submitting} className="rounded-xl px-6 whitespace-nowrap">
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
