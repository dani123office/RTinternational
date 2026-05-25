import { Bolt, Flame } from 'lucide-react'
import { formatRate, formatCurrency, formatDate } from '@/lib/formatters'

export default function MeterDetailsCard({ utilityType, meters }) {
  if (!meters || meters.length === 0) return null

  const isElec = utilityType === 'electricity'
  const Icon = isElec ? Bolt : Flame

  return (
    <div className="rt-card">
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><Icon size={16} /></div>
          <span className="rt-card-title">{isElec ? 'Electricity' : 'Gas'} Meters ({meters.length})</span>
        </div>
      </div>
      
      <div className="rt-card-body">
        {meters.map((m, i) => (
          <div key={m.id || i} className={i > 0 ? 'mt-4 pt-4 border-t border-slate-100' : ''}>

            {/* 🌟 FIXED: Condition forces proper sequential naming (Meter 1, Meter 2, Meter 3) */}
            {meters.length > 1 && (
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  marginBottom: '10px',
                  marginTop: i > 0 ? '8px' : '0px',
                  color: isElec ? '#b45309' : '#1d4ed8', // Amber for Elec, Blue for Gas
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Meter {i + 1}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className={isElec && m.supplyNumber ? '' : 'col-span-2'}>
                <span className="text-slate-500">Meter No.</span>
                <p className="font-semibold text-slate-900 mt-1">{m.meterNumber || i + 1}</p>
              </div>
              {isElec && m.supplyNumber && (
                <div>
                  <span className="text-slate-500">MPAN / Supply No.</span>
                  <p className="font-semibold text-slate-900 mt-1 font-mono text-xs break-all">{m.supplyNumber}</p>
                </div>
              )}
              {m.currentSupplier && (
                <div>
                  <span className="text-slate-500">Supplier</span>
                  <p className="font-semibold text-slate-900 mt-1 capitalize">{m.currentSupplier}</p>
                </div>
              )}
              {isElec && m.dayUnitRate != null && (
                <div>
                  <span className="text-slate-500">Day Rate</span>
                  <p className="font-semibold text-slate-900 mt-1">{formatRate(m.dayUnitRate)}</p>
                </div>
              )}
              {isElec && m.nightUnitRate != null && (
                <div>
                  <span className="text-slate-500">Night Rate</span>
                  <p className="font-semibold text-slate-900 mt-1">{formatRate(m.nightUnitRate)}</p>
                </div>
              )}
              {isElec && m.eveningUnitRate != null && (
                <div>
                  <span className="text-slate-500">Evening Rate</span>
                  <p className="font-semibold text-slate-900 mt-1">{formatRate(m.eveningUnitRate)}</p>
                </div>
              )}
              {!isElec && m.unitRate != null && (
                <div>
                  <span className="text-slate-500">Unit Rate</span>
                  <p className="font-semibold text-slate-900 mt-1">{formatRate(m.unitRate)}</p>
                </div>
              )}
              {m.standingRate != null && (
                <div>
                  <span className="text-slate-500">Standing</span>
                  <p className="font-semibold text-slate-900 mt-1">{formatRate(m.standingRate, 'p/day')}</p>
                </div>
              )}
              {m.monthlyBill != null && (
                <div>
                  <span className="text-slate-500">Monthly Bill</span>
                  <p className="font-semibold text-slate-900 mt-1">{formatCurrency(m.monthlyBill)}</p>
                </div>
              )}
              {m.contractEndDate && (
                <div>
                  <span className="text-slate-500">Contract End</span>
                  <p className="font-semibold text-slate-900 mt-1">{formatDate(m.contractEndDate)}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
