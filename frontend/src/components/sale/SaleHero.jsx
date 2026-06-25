import { useMemo } from 'react'
import { Calendar, Building2 } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/formatters'

export default function SaleHero({ sale, customer }) {
  const fallbackDate = useMemo(() => new Date(), [])
  if (!sale) return null
  const saleDate = sale.createdAt ? new Date(sale.createdAt) : fallbackDate

  const saleTypeLabel = sale.saleType === 'cot' ? 'COT'
    : sale.saleType === 'renewal' ? 'Renewal'
    : sale.saleType === 'out_of_contract' ? 'Out of Contract'
    : 'COT'

  return (
    <div className="rounded-2xl p-6 md:p-8 mb-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white relative overflow-hidden shadow-sm">
      <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-15 bg-radial-gradient from-white to-transparent blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={sale.cotStatus} type="sale" />
          <span className="text-xs font-semibold rounded-full px-3 py-1 bg-white/20 capitalize backdrop-blur-sm">
            {saleTypeLabel}
          </span>
          <span className="text-xs font-semibold rounded-full px-3 py-1 bg-white/20 capitalize backdrop-blur-sm">
            {customer?.utilityType || 'N/A'}
          </span>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">
          {sale.ownerFullName || customer?.businessName || 'Unknown'}
        </h2>
        <p className="text-white/80 text-sm md:text-base">
          {sale.homeAddress || customer?.businessAddress}
        </p>

        <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-white/80 font-medium">
          <span className="flex items-center gap-2">
            <Calendar size={16} /> 
            {formatDate(saleDate)}
          </span>
          {sale.businessType && (
            <span className="flex items-center gap-2">
              <Building2 size={16} /> 
              {sale.businessType.replace(/([A-Z])/g, ' ').trim()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
