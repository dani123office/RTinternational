import { APP_STYLES } from '@/lib/styles'
import { Loader2, ArrowLeft, FileText, Trash2, Activity, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSaleDetail } from '@/hooks/useSaleDetail'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import SaleHero from '@/components/sale/SaleHero'
import PaymentDetailsCard from '@/components/sale/PaymentDetailsCard'
import CustomerInfoCard from '@/components/shared/CustomerInfoCard'
import OfferedRatesCard from '@/components/shared/OfferedRatesCard'
import ProgressTracker from '@/components/shared/ProgressTracker'
import { useAuthStore } from '@/store/authStore'

const rateHistorySteps = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'chasing', label: 'Chasing' },
  { key: 'cotInProgress', label: 'COT In Progress' },
  { key: 'cotComplete', label: 'COT Complete' },
]

function Card({ icon: Icon, title, headerRight, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay||''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          {Icon && (
            <div className="rt-card-icon">
              <Icon size={16} />
            </div>
          )}
          <span className="rt-card-title">{title}</span>
        </div>
        {headerRight}
      </div>
      <div className="rt-card-body">{children}</div>
    </div>
  )
}

export default function SaleDetail() {
  const navigate = useNavigate()
  const {
    sale, linkedTransfer,
    showDelete, setShowDelete,
    handleStatusChange, handleDelete,
    loading, error,
  } = useSaleDetail()
  const { user } = useAuthStore()
  const isManager = user?.role === 'manager'

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 rt-spin text-indigo-500" />
          <span className="text-sm text-slate-400 font-medium">Loading sale details...</span>
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="rt-card p-10 text-center">
            <p className="text-slate-400 text-sm">{error || 'Sale not found.'}</p>
            <button onClick={() => navigate(isManager ? '/manager/sales' : '/sales')} className="mt-4 text-indigo-600 text-sm font-medium cursor-pointer border-0 bg-transparent">
              ← Back to sales
            </button>
          </div>
        </div>
      </>
    )
  }

  const customer = sale.customer || {}
  const compositeCustomer = {
    ...customer,
    ownerName: sale.dateOfBirth ? `${sale.ownerFullName} (DOB: ${new Date(sale.dateOfBirth).toLocaleDateString('en-GB')})` : sale.ownerFullName,
    businessAddress: sale.homeAddress,
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{maxWidth:'800px', margin:'0 auto'}}>
          <div className="rt-page-header">
            <button className="rt-back-btn" onClick={() => navigate(isManager ? -1 : '/sales')}>
              <ArrowLeft size={17}/>
            </button>
            <div>
              <h1 className="rt-page-title">Sale Details</h1>
              <p className="rt-page-subtitle">View and manage sale application</p>
            </div>
          </div>
          <div className="rt-section-gap">
            <SaleHero sale={sale} customer={customer} />

            <Card icon={Activity} title="Progress" delay="rt-d1">
              <ProgressTracker currentStatus={sale.cotStatus || 'submitted'} steps={rateHistorySteps} />
            </Card>

            <CustomerInfoCard customer={compositeCustomer} />
            <PaymentDetailsCard sale={sale} />

            <Card icon={CheckCircle} title="Status" delay="rt-d2">
              <Select value={sale.cotStatus} onChange={(e) => handleStatusChange(e.target.value)} className="rt-input" style={{maxWidth:'280px'}}>
                <option value="chasing">Chasing</option>
                <option value="cotInProgress">COT In Progress</option>
                <option value="cotComplete">COT Complete</option>
                <option value="done">Sale Complete</option>
              </Select>
            </Card>

            {sale.notes && (
              <Card icon={FileText} title="Notes" delay="rt-d3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{sale.notes}</p>
              </Card>
            )}



            {linkedTransfer?.offeredElectricityRates?.length > 0 && (
              <OfferedRatesCard transfer={linkedTransfer} />
            )}

            <div className="rt-actions">
              <button onClick={() => setShowDelete(true)} className="rt-btn-danger">
                <Trash2 size={16} /> Delete Sale
              </button>
            </div>
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
            <DialogTitle className="text-lg text-center">Delete Sale?</DialogTitle>
            <DialogDescription className="text-center text-slate-500">
              This action cannot be undone. All associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
