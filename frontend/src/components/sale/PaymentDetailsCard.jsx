import { Landmark } from 'lucide-react'
import { formatPaymentMethod } from '@/lib/formatters'

export default function PaymentDetailsCard({ sale }) {
  if (!sale) return null

  return (
    <div className="rt-card">
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><Landmark size={16} /></div>
          <span className="rt-card-title">Payment Details</span>
        </div>
      </div>
      
      <div className="rt-card-body grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {sale.paymentMethod && (
          <div>
            <span className="text-slate-500">Method</span>
            <p className="font-semibold text-slate-900 mt-1">
              {formatPaymentMethod(sale.paymentMethod)}
            </p>
          </div>
        )}
        
        {sale.bankName && (
          <div>
            <span className="text-slate-500">Bank</span>
            <p className="font-semibold text-slate-900 mt-1">{sale.bankName}</p>
          </div>
        )}
        
        {sale.accountType && (
          <div>
            <span className="text-slate-500">Account Type</span>
            <p className="font-semibold text-slate-900 mt-1">{sale.accountType}</p>
          </div>
        )}
        
        {sale.accountTitle && (
          <div>
            <span className="text-slate-500">Account Title</span>
            <p className="font-semibold text-slate-900 mt-1">{sale.accountTitle}</p>
          </div>
        )}
        
        {sale.sortCode && (
          <div>
            <span className="text-slate-500">Sort Code</span>
            <p className="font-semibold text-slate-900 mt-1">{sale.sortCode}</p>
          </div>
        )}
        
        {sale.bankAccountNumber && (
          <div>
            <span className="text-slate-500">Account No.</span>
            <p className="font-semibold text-slate-900 mt-1">{sale.bankAccountNumber}</p>
          </div>
        )}
      </div>
    </div>
  )
}
