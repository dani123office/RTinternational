import { APP_STYLES } from '@/lib/styles'
import { Loader2, ArrowLeft, Trash2, Gauge, PhoneCall, ArrowLeftRight, PoundSterling, Clock, CreditCard, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useCustomerDetail } from '@/hooks/useCustomerDetail'
import { useDataStore } from '@/store/dataStore'
import { STATUS_CONFIG } from '@/lib/constants'
import { formatDateTime, formatRate, formatDate, formatCurrency } from '@/lib/formatters'
import CustomerHero from '@/components/customer/CustomerHero'
import CustomerInfoCard from '@/components/shared/CustomerInfoCard'
import MeterDetailsCard from '@/components/shared/MeterDetailsCard'
import DeleteCustomerDialog from '@/components/customer/DeleteCustomerDialog'

function StatusBadge({ status, type }) {
  const statusKey = (status || '').toLowerCase()
  const cfg = STATUS_CONFIG[statusKey] || { label: status, bg: '#f1f5f9', color: '#475569' }
  let label = cfg.label
  if (statusKey === 'done' || statusKey === 'completed') {
    if (type === 'callback') {
      label = 'Callback Complete'
    } else if (type === 'transfer') {
      label = 'Transfer Complete'
    } else if (type === 'sale') {
      label = 'Sale Complete'
    }
  }
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.color, textTransform: 'capitalize' }}
    >
      {label}
    </span>
  )
}

export default function CustomerDetail() {
  const navigate = useNavigate()
  const { customer, showDelete, setShowDelete, handleDelete } = useCustomerDetail()
  const { callbacks, transfers, sales, loadAll } = useDataStore()

  useEffect(() => {
    loadAll()
  }, [loadAll])

  if (!customer) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="rt-card" style={{ padding: '40px' }}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 rt-spin" color="#6366f1" />
                <p className="text-sm text-gray-500 font-medium">Loading customer...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const customerCallbacks = callbacks.filter((c) => c.customerId === customer.id)
  const customerNotInterestedCallbacks = callbacks.filter((c) => c.customerId === customer.id && (c.outcome === 'not_interested' || c.status === 'not_interested'))
  const customerNotInterestedTransfers = transfers.filter((t) => t.customerId === customer.id && (t.outcome === 'not_interested' || t.status === 'not_interested'))
  const customerTransfers = transfers.filter((t) => t.customerId === customer.id)
  const customerSales = sales.filter((s) => s.customerId === customer.id)
  const latestTransfer = customerTransfers[0]

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px' }} className="rt-fade">
            <button className="rt-back-btn" onClick={() => navigate('/customers')}>
              <ArrowLeft size={17} />
            </button>
          </div>

          <div className="rt-fade rt-d1">
            <CustomerHero customer={customer} />
          </div>

          <div className="rt-fade rt-d2" style={{ marginBottom: '20px' }}>
            <div className="rt-card">
              <div className="rt-card-body">
                <div className="flex flex-col sm:flex-row gap-3">
                  {customerCallbacks.length === 0 ? (
                    <button
                      onClick={() => navigate('/callbacks/add', { state: { fromCustomer: true, prefillData: customer } })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 active:bg-indigo-200 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <PhoneCall size={16} /> Schedule Callback
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed">
                      <PhoneCall size={16} /> Callback Already Scheduled
                    </div>
                  )}
                  {customerTransfers.length === 0 ? (
                    <button
                      onClick={() => navigate('/transfers/add', { state: { fromCustomer: true, prefillData: customer } })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 active:bg-emerald-200 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <ArrowLeftRight size={16} /> Mark as Transfer
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed">
                      <ArrowLeftRight size={16} /> Transfer Already Exists
                    </div>
                  )}
                  {customerSales.length === 0 ? (
                    <button
                      onClick={() => navigate('/sales/apply', { state: { fromCustomer: true, prefillData: { ...customer, offeredElectricityRates: latestTransfer?.offeredElectricityRates || [], offeredGasRates: latestTransfer?.offeredGasRates || [] } } })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 active:bg-amber-200 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <PoundSterling size={16} /> Mark as Sale
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed">
                      <PoundSterling size={16} /> Sale Already Exists
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rt-fade rt-d2" style={{ marginBottom: '20px' }}>
            <CustomerInfoCard customer={customer} />
          </div>

          {customer.electricityMeters?.length > 0 && (
            <div className="rt-fade rt-d3" style={{ marginBottom: '20px' }}>
              <MeterDetailsCard utilityType="electricity" meters={customer.electricityMeters} />
            </div>
          )}
          {customer.gasMeters?.length > 0 && (
            <div className="rt-fade rt-d4" style={{ marginBottom: '20px' }}>
              <MeterDetailsCard utilityType="gas" meters={customer.gasMeters} />
            </div>
          )}
          {!customer.electricityMeters?.length && !customer.gasMeters?.length && (
            <div className="rt-card rt-fade rt-d3" style={{ padding: '40px', textAlign: 'center', marginBottom: '20px' }}>
              <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Gauge size={28} className="text-gray-400" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">No meters recorded</p>
              <p className="text-gray-500 text-xs mt-1">Meter details will appear here once added.</p>
            </div>
          )}

          {/* Callbacks Section */}
          <div className="rt-card rt-fade rt-d3" style={{ marginBottom: '20px' }}>
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}><PhoneCall size={16} color="#6366f1" /></div>
                <span className="rt-card-title">Scheduled Callbacks ({customerCallbacks.length})</span>
              </div>
            </div>
            <div className="rt-card-body">
              {customerCallbacks.length > 0 ? (
                <div className="space-y-4">
                  {customerCallbacks.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      onClick={() => c.id && navigate(`/callbacks/${c.id}`)}
                      className={`p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2.5 text-sm cursor-pointer hover:bg-slate-100/70 hover:shadow-sm transition-all duration-200 ${idx > 0 ? 'mt-3' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {formatDateTime(c.scheduledDateTime || c.scheduledDate)}
                        </span>
                        <StatusBadge status={c.status} type="callback" />
                      </div>
                      {c.notes && (
                        <div className="text-slate-600 bg-white p-3 rounded-lg border border-slate-100 mt-1">
                          <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">Call Notes</p>
                          <p className="whitespace-pre-wrap leading-relaxed text-xs">{c.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No callbacks scheduled for this customer.</p>
              )}
            </div>
          </div>

          {/* Not Interested Section */}
          {(customerNotInterestedCallbacks.length > 0 || customerNotInterestedTransfers.length > 0) && (
            <div className="rt-card rt-fade rt-d4" style={{ marginBottom: '20px' }}>
              <div className="rt-card-header">
                <div className="rt-card-header-left">
                  <div className="rt-card-icon" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}><X size={16} color="#ef4444" /></div>
                  <span className="rt-card-title">Not Interested ({customerNotInterestedCallbacks.length + customerNotInterestedTransfers.length})</span>
                </div>
              </div>
              <div className="rt-card-body">
                <div className="space-y-4">
                  {customerNotInterestedCallbacks.map((c, idx) => (
                    <div key={c.id || idx} className="p-4 rounded-xl border border-red-100 bg-red-50/50 flex flex-col gap-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-red-800 flex items-center gap-1.5">
                          <PhoneCall size={14} className="text-red-400" />
                          Callback - Not Interested
                        </span>
                        <span className="text-xs text-red-400 font-medium">
                          {formatDateTime(c.scheduledDateTime || c.scheduledDate || c.createdAt)}
                        </span>
                      </div>
                      {c.notInterestedReason && (
                        <div className="text-red-700 bg-white p-3 rounded-lg border border-red-100 mt-1">
                          <p className="text-xs text-red-400 font-semibold mb-1 uppercase tracking-wide">Reason</p>
                          <p className="whitespace-pre-wrap leading-relaxed text-xs">{c.notInterestedReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {customerNotInterestedTransfers.map((t, idx) => (
                    <div key={t.id || idx} className="p-4 rounded-xl border border-red-100 bg-red-50/50 flex flex-col gap-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-red-800 flex items-center gap-1.5">
                          <ArrowLeftRight size={14} className="text-red-400" />
                          Transfer - Not Interested
                        </span>
                        <span className="text-xs text-red-400 font-medium">
                          {formatDateTime(t.scheduledDateTime || t.createdAt)}
                        </span>
                      </div>
                      {t.notInterestedReason && (
                        <div className="text-red-700 bg-white p-3 rounded-lg border border-red-100 mt-1">
                          <p className="text-xs text-red-400 font-semibold mb-1 uppercase tracking-wide">Reason</p>
                          <p className="whitespace-pre-wrap leading-relaxed text-xs">{t.notInterestedReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transfers Section */}
          <div className="rt-card rt-fade rt-d5" style={{ marginBottom: '20px' }}>
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}><ArrowLeftRight size={16} color="#22c55e" /></div>
                <span className="rt-card-title">Transfer Records ({customerTransfers.length})</span>
              </div>
            </div>
            <div className="rt-card-body">
              {customerTransfers.length > 0 ? (
                <div className="space-y-4">
                  {customerTransfers.map((t, idx) => {
                    const eRates = t.offeredElectricityRates || []
                    const gRates = t.offeredGasRates || []
                    const hasOffer = eRates.length > 0 || gRates.length > 0
                    return (
                      <div
                        key={t.id || idx}
                        onClick={() => t.id && navigate(`/transfers/${t.id}`)}
                        className={`p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3 text-sm cursor-pointer hover:bg-slate-100/70 hover:shadow-sm transition-all duration-200 ${idx > 0 ? 'mt-3' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">Transfer #{t.id}</span>
                            <span className="text-xs text-slate-400 font-medium capitalize">({t.utilityType || 'electricity'})</span>
                          </div>
                          <StatusBadge status={t.status} type="transfer" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                          {t.scheduledDateTime && (
                            <div>
                              <span className="text-slate-400 font-medium">Scheduled Time</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{formatDateTime(t.scheduledDateTime)}</p>
                            </div>
                          )}
                          {t.accountNumber && (
                            <div>
                              <span className="text-slate-400 font-medium">Account Number</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{t.accountNumber}</p>
                            </div>
                          )}
                          {t.mpan && (
                            <div>
                              <span className="text-slate-400 font-medium">MPAN</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{t.mpan}</p>
                            </div>
                          )}
                          {t.mprn && (
                            <div>
                              <span className="text-slate-400 font-medium">MPRN</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{t.mprn}</p>
                            </div>
                          )}
                          {t.msn && (
                            <div>
                              <span className="text-slate-400 font-medium">MSN</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{t.msn}</p>
                            </div>
                          )}
                          {t.supplier && (
                            <div>
                              <span className="text-slate-400 font-medium">Supplier</span>
                              <p className="font-semibold text-slate-800 mt-0.5 capitalize">{t.supplier}</p>
                            </div>
                          )}
                        </div>

                        {hasOffer && (
                          <div className="mt-1">
                            <p className="text-xs text-indigo-600 font-bold mb-2 flex items-center gap-1">
                              <ChevronRight size={13} />
                              Offered Rates Details
                            </p>
                            
                            {eRates.map((r, rIdx) => (
                              <div key={rIdx} className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/50 mb-2 text-xs flex flex-col gap-2">
                                <div className="flex justify-between font-bold text-indigo-950">
                                  <span>Electricity Offer ({r.contractLength || '1 Year'})</span>
                                  <span className="capitalize">{r.supplier}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-indigo-900 mt-1">
                                  {r.meterType && <div className="col-span-2">Meter Type: <span className="font-semibold capitalize">{r.meterType}</span></div>}
                                  {r.commissionType && <div className="col-span-2">Type: <span className="font-semibold capitalize">{r.commissionType}</span></div>}
                                </div>
                                {(r.dayUnitRate != null || r.nightUnitRate != null || r.eveningUnitRate != null || r.standingRate != null) && (
                                  <>
                                    <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mt-1 mb-0.5">Commission Rates</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-indigo-900">
                                      {r.dayUnitRate != null && <div>Day Rate: <span className="font-semibold">{formatRate(r.dayUnitRate)}</span></div>}
                                      {r.nightUnitRate != null && <div>Night Rate: <span className="font-semibold">{formatRate(r.nightUnitRate)}</span></div>}
                                      {r.eveningUnitRate != null && <div>Evening Rate: <span className="font-semibold">{formatRate(r.eveningUnitRate)}</span></div>}
                                      {r.standingRate != null && <div>Standing: <span className="font-semibold">{formatRate(r.standingRate, 'p/day')}</span></div>}
                                    </div>
                                  </>
                                )}
                                {(r.nonCommissionDayRate != null || r.nonCommissionNightRate != null || r.nonCommissionEveningRate != null || r.nonCommissionStandingRate != null) && (
                                  <>
                                    <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mt-1 mb-0.5">Non-Commission Rates</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-indigo-900">
                                      {r.nonCommissionDayRate != null && <div>Day Rate: <span className="font-semibold">{formatRate(r.nonCommissionDayRate)}</span></div>}
                                      {r.nonCommissionNightRate != null && <div>Night Rate: <span className="font-semibold">{formatRate(r.nonCommissionNightRate)}</span></div>}
                                      {r.nonCommissionEveningRate != null && <div>Evening Rate: <span className="font-semibold">{formatRate(r.nonCommissionEveningRate)}</span></div>}
                                      {r.nonCommissionStandingRate != null && <div>Standing: <span className="font-semibold">{formatRate(r.nonCommissionStandingRate, 'p/day')}</span></div>}
                                    </div>
                                  </>
                                )}
                                {r.brokerServiceCharge != null && (
                                  <div className="text-indigo-900 mt-0.5">Broker Fee: <span className="font-semibold">{formatCurrency(r.brokerServiceCharge)}</span></div>
                                )}
                              </div>
                            ))}

                            {gRates.map((r, rIdx) => (
                              <div key={rIdx} className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100/50 text-xs flex flex-col gap-2">
                                <div className="flex justify-between font-bold text-emerald-950">
                                  <span>Gas Offer ({r.contractLength || '1 Year'})</span>
                                  <span className="capitalize">{r.supplier}</span>
                                </div>
                                {(r.unitRate != null || r.standingRate != null) && (
                                  <>
                                    <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mt-1 mb-0.5">Commission Rates</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-emerald-900">
                                      {r.unitRate != null && <div>Unit Rate: <span className="font-semibold">{formatRate(r.unitRate)}</span></div>}
                                      {r.standingRate != null && <div>Standing: <span className="font-semibold">{formatRate(r.standingRate, 'p/day')}</span></div>}
                                    </div>
                                  </>
                                )}
                                {(r.nonCommissionUnitRate != null || r.nonCommissionStandingRate != null) && (
                                  <>
                                    <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mt-1 mb-0.5">Non-Commission Rates</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-emerald-900">
                                      {r.nonCommissionUnitRate != null && <div>Unit Rate: <span className="font-semibold">{formatRate(r.nonCommissionUnitRate)}</span></div>}
                                      {r.nonCommissionStandingRate != null && <div>Standing: <span className="font-semibold">{formatRate(r.nonCommissionStandingRate, 'p/day')}</span></div>}
                                    </div>
                                  </>
                                )}
                                {r.brokerServiceCharge != null && (
                                  <div className="text-emerald-900 mt-0.5">Broker Fee: <span className="font-semibold">{formatCurrency(r.brokerServiceCharge)}</span></div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {t.notes && (
                          <div className="text-slate-600 bg-white p-3 rounded-lg border border-slate-100 mt-1">
                            <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">Transfer Notes</p>
                            <p className="whitespace-pre-wrap leading-relaxed text-xs">{t.notes}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No transfers recorded for this customer.</p>
              )}
            </div>
          </div>

          {/* Sales Section */}
          <div className="rt-card rt-fade rt-d6" style={{ marginBottom: '20px' }}>
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}><PoundSterling size={16} color="#f59e0b" /></div>
                <span className="rt-card-title">Sale Applications ({customerSales.length})</span>
              </div>
            </div>
            <div className="rt-card-body">
              {customerSales.length > 0 ? (
                <div className="space-y-4">
                  {customerSales.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      onClick={() => s.id && navigate(`/sales/${s.id}`)}
                      className={`p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3 text-sm cursor-pointer hover:bg-slate-100/70 hover:shadow-sm transition-all duration-200 ${idx > 0 ? 'mt-3' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-slate-800">Sale Application #{s.id}</span>
                        <StatusBadge status={s.cotStatus || 'submitted'} type="sale" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                        {s.ownerFullName && (
                          <div>
                            <span className="text-slate-400 font-medium">Owner Full Name</span>
                            <p className="font-semibold text-slate-800 mt-0.5">{s.ownerFullName}</p>
                          </div>
                        )}
                        {s.dateOfBirth && (
                          <div>
                            <span className="text-slate-400 font-medium">Date of Birth</span>
                            <p className="font-semibold text-slate-800 mt-0.5">{formatDate(s.dateOfBirth)}</p>
                          </div>
                        )}
                        {s.businessType && (
                          <div>
                            <span className="text-slate-400 font-medium">Business Type</span>
                            <p className="font-semibold text-slate-800 mt-0.5 capitalize">{s.businessType}</p>
                          </div>
                        )}
                        {s.billFrequency && (
                          <div>
                            <span className="text-slate-400 font-medium">Bill Frequency</span>
                            <p className="font-semibold text-slate-800 mt-0.5 capitalize">{s.billFrequency}</p>
                          </div>
                        )}
                        {s.homeAddress && (
                          <div className="col-span-2">
                            <span className="text-slate-400 font-medium">Home Address</span>
                            <p className="font-semibold text-slate-800 mt-0.5">{s.homeAddress}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-orange-50/40 p-3 rounded-lg border border-orange-100/50 text-xs flex flex-col gap-2">
                        <span className="font-bold text-orange-950 flex items-center gap-1.5">
                          <CreditCard size={13} />
                          Payment & Bank Details ({s.paymentMethod || 'Direct Debit'})
                        </span>
                        {(s.bankName || s.bankAccountNumber) && (
                          <div className="grid grid-cols-2 gap-2 text-orange-900 mt-1">
                            {s.bankName && <div>Bank Name: <span className="font-semibold">{s.bankName}</span></div>}
                            {s.accountType && <div>Account Type: <span className="font-semibold">{s.accountType}</span></div>}
                            {s.accountTitle && <div>Account Title: <span className="font-semibold">{s.accountTitle}</span></div>}
                            {s.sortCode && <div>Sort Code: <span className="font-semibold">{s.sortCode}</span></div>}
                            {s.bankAccountNumber && <div className="col-span-2">Account Number: <span className="font-semibold">{s.bankAccountNumber}</span></div>}
                          </div>
                        )}
                      </div>

                      {s.notes && (
                        <div className="text-slate-600 bg-white p-3 rounded-lg border border-slate-100 mt-1">
                          <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">Sales Notes</p>
                          <p className="whitespace-pre-wrap leading-relaxed text-xs">{s.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No sales applications recorded for this customer.</p>
              )}
            </div>
          </div>

          <div className="rt-fade rt-d7 rt-actions" style={{ borderTop: '1px solid #e2e6ec', paddingTop: '24px' }}>
            <button onClick={() => setShowDelete(true)} className="rt-btn-danger">
              <Trash2 size={16} /> Delete Customer
            </button>
          </div>

          <DeleteCustomerDialog open={showDelete} onClose={() => setShowDelete(false)} customer={customer} onDelete={handleDelete} />
        </div>
      </div>
    </>
  )
}
