import { Tag } from 'lucide-react'
import { formatRate, formatCurrency } from '@/lib/formatters'

function ElecRateRow({ r }) {
  const hasCommission = r.dayUnitRate != null || r.nightUnitRate != null || r.eveningUnitRate != null || r.standingRate != null
  const hasNonCommission = r.nonCommissionDayRate != null || r.nonCommissionNightRate != null || r.nonCommissionEveningRate != null || r.nonCommissionStandingRate != null
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      {r.contractLength && <div><span className="text-slate-500">Contract</span><p className="font-semibold text-slate-900 mt-1">{r.contractLength}</p></div>}
      {r.supplier && <div><span className="text-slate-500">Supplier</span><p className="font-semibold text-slate-900 mt-1 capitalize">{r.supplier}</p></div>}
      {r.meterType && <div><span className="text-slate-500">Meter Type</span><p className="font-semibold text-slate-900 mt-1">{r.meterType}</p></div>}
      {r.commissionType && <div><span className="text-slate-500">Commission Type</span><p className="font-semibold text-slate-900 mt-1 capitalize">{r.commissionType}</p></div>}

      {hasCommission && (
        <div className="col-span-full">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Commission Rates</p>
        </div>
      )}
      {r.dayUnitRate != null && <div><span className="text-slate-500">Day Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.dayUnitRate)}</p></div>}
      {r.nightUnitRate != null && <div><span className="text-slate-500">Night Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.nightUnitRate)}</p></div>}
      {r.eveningUnitRate != null && <div><span className="text-slate-500">Evening Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.eveningUnitRate)}</p></div>}
      {r.standingRate != null && <div><span className="text-slate-500">Standing Charge</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.standingRate, 'p/day')}</p></div>}

      {hasNonCommission && (
        <div className="col-span-full">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Non-Commission Rates</p>
        </div>
      )}
      {r.nonCommissionDayRate != null && <div><span className="text-slate-500">Day Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.nonCommissionDayRate)}</p></div>}
      {r.nonCommissionNightRate != null && <div><span className="text-slate-500">Night Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.nonCommissionNightRate)}</p></div>}
      {r.nonCommissionEveningRate != null && <div><span className="text-slate-500">Evening Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.nonCommissionEveningRate)}</p></div>}
      {r.nonCommissionStandingRate != null && <div><span className="text-slate-500">Standing Charge</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.nonCommissionStandingRate, 'p/day')}</p></div>}

      {r.brokerServiceCharge != null && <div><span className="text-slate-500">Broker Fee</span><p className="font-semibold text-slate-900 mt-1">{formatCurrency(r.brokerServiceCharge)}</p></div>}
    </div>
  )
}

function GasRateRow({ r }) {
  const hasCommission = r.unitRate != null || r.standingRate != null
  const hasNonCommission = r.nonCommissionUnitRate != null || r.nonCommissionStandingRate != null
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      {r.contractLength && <div><span className="text-slate-500">Contract</span><p className="font-semibold text-slate-900 mt-1">{r.contractLength}</p></div>}
      {r.supplier && <div><span className="text-slate-500">Supplier</span><p className="font-semibold text-slate-900 mt-1 capitalize">{r.supplier}</p></div>}

      {hasCommission && (
        <div className="col-span-full">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Commission Rates</p>
        </div>
      )}
      {r.unitRate != null && <div><span className="text-slate-500">Unit Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.unitRate)}</p></div>}
      {r.standingRate != null && <div><span className="text-slate-500">Standing Charge</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.standingRate, 'p/day')}</p></div>}

      {hasNonCommission && (
        <div className="col-span-full">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Non-Commission Rates</p>
        </div>
      )}
      {r.nonCommissionUnitRate != null && <div><span className="text-slate-500">Unit Rate</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.nonCommissionUnitRate)}</p></div>}
      {r.nonCommissionStandingRate != null && <div><span className="text-slate-500">Standing Charge</span><p className="font-semibold text-slate-900 mt-1">{formatRate(r.nonCommissionStandingRate, 'p/day')}</p></div>}

      {r.brokerServiceCharge != null && <div><span className="text-slate-500">Broker Fee</span><p className="font-semibold text-slate-900 mt-1">{formatCurrency(r.brokerServiceCharge)}</p></div>}
    </div>
  )
}

export default function OfferedRatesCard({ transfer }) {
  const hasElec = transfer?.offeredElectricityRates?.length > 0
  const hasGas = transfer?.offeredGasRates?.length > 0

  if (!hasElec && !hasGas) return null

  return (
    <div className="rt-card">
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><Tag size={16} /></div>
          <span className="rt-card-title">Offered Rates</span>
        </div>
      </div>

      <div className="rt-card-body flex flex-col gap-6">
        {hasElec && transfer.offeredElectricityRates.map((r, i) => (
          <div key={`elec-${i}`}>
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3">Electricity</p>
            <ElecRateRow r={r} />
          </div>
        ))}

        {hasGas && transfer.offeredGasRates.map((r, i) => (
          <div key={`gas-${i}`} className={hasElec && i === 0 ? "pt-4 border-t border-green-100" : ""}>
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3">Gas</p>
            <GasRateRow r={r} />
          </div>
        ))}
      </div>
    </div>
  )
}
