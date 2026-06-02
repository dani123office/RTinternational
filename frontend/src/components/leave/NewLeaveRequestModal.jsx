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
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />

        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leave Type</Label>
            <Select defaultValue="">
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
                  className="w-full rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-200 pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</Label>
            <textarea
              placeholder="Explain the reason for your leave..."
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 hover:border-slate-400 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 pr-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-6">
            Cancel
          </Button>
          <Button onClick={onSubmit} className="rounded-xl px-6 whitespace-nowrap">
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
