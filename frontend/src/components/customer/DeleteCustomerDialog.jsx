import { Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function DeleteCustomerDialog({ open, onClose, customer, onDelete }) {
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm w-full">
        <DialogClose onClose={onClose} />
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
            <Trash2 size={22} color="#ef4444" />
          </div>
          <DialogTitle className="text-lg text-center">Delete Customer?</DialogTitle>
          <DialogDescription className="text-center text-slate-500">
            This will permanently delete <span className="font-semibold text-slate-900">{customer.businessName || 'this customer'}</span> and all associated data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-center">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
