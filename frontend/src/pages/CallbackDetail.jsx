import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ArrowLeft, FileText, PhoneCall, PoundSterling, ArrowLeftRight } from 'lucide-react'

import { APP_STYLES } from '@/lib/styles'
import { useCallbackDetail } from '@/hooks/useCallbackDetail'
import { useAuthStore } from '@/store/authStore'

import CallbackHero from '@/components/callbacks/CallbackHero'
import CallbackActions from '@/components/callbacks/CallbackActions'
import CallbackDialogs from '@/components/callbacks/CallbackDialogs'
import CustomerInfoCard from '@/components/shared/CustomerInfoCard'
import AccountDetailsCard from '@/components/shared/AccountDetailsCard'
import MeterDetailsCard from '@/components/shared/MeterDetailsCard'
import OfferedRatesCard from '@/components/shared/OfferedRatesCard'

function DashboardCard({ icon: Icon, title, children, delay = '' }) {
  return (
    <div className={`rt-card rt-fade ${delay}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><Icon size={16} /></div>
          <span className="rt-card-title">{title}</span>
        </div>
      </div>
      <div className="rt-card-body">{children}</div>
    </div>
  )
}

function LinkedRow({ icon: Icon, iconBg, iconColor, label, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors border border-slate-100"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={15} color={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
        {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
      </div>
      <ArrowLeftRight size={13} className="ml-auto text-slate-400 shrink-0" />
    </div>
  )
}

export default function CallbackDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const isManager = user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
  const agentId = location.state?.agentId

  const {
    callback, customer, linkedTransfers, linkedSales, loading, converting,
    showReschedule, setShowReschedule,
    rescheduleDate, setRescheduleDate, rescheduleTime, setRescheduleTime,
    showNotInterested, setShowNotInterested,
    notInterestedReason, setNotInterestedReason,
    handleDelete, handleReschedule, handleNotInterested, handleConfirmNotInterested, handleMarkAsTransfer,
  } = useCallbackDetail(id, navigate)

  if (loading || !callback) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5">
            <Loader2 size={40} className="rt-spin text-indigo-600" />
            <div className="flex flex-col items-center gap-2">
              <div className="rt-fade h-3 w-32 rounded bg-slate-200 opacity-60" />
              <div className="rt-fade rt-d1 h-2.5 w-48 rounded bg-slate-100 opacity-50" />
            </div>
          </div>
        </div>
      </>
    )
  }

  // Check if utility meters exist to prevent rendering empty cards
  const hasElectricity = customer?.electricityMeters && customer.electricityMeters.length > 0;
  const hasGas = customer?.gasMeters && customer.gasMeters.length > 0;

  const fallbackTransfer = linkedTransfers?.[0] || {}

  const preferredMpAN = fallbackTransfer?.mpan || callback?.linkedTransferMpan || customer?.electricityMeters?.[0]?.supplyNumber
  const displayedElectricityMeters = preferredMpAN && hasElectricity
    ? customer.electricityMeters.map((m, index) => ({
        ...m,
        supplyNumber: index === 0 ? preferredMpAN : m.supplyNumber,
      }))
    : customer?.electricityMeters || []
  const accountDetails = {
    accountNumber: callback?.accountNumber || fallbackTransfer?.accountNumber || callback?.linkedTransferAccountNumber,
    mpan: callback?.mpan || fallbackTransfer?.mpan || callback?.linkedTransferMpan || customer?.electricityMeters?.[0]?.supplyNumber,
    mprn: callback?.mprn || fallbackTransfer?.mprn || callback?.linkedTransferMprn,
    msn: callback?.msn || fallbackTransfer?.msn || callback?.linkedTransferMsn,
  }
  const mergedForRates = {
    ...callback,
    offeredElectricityRates: callback?.offeredElectricityRates?.length
      ? callback.offeredElectricityRates
      : (fallbackTransfer?.offeredElectricityRates || []),
    offeredGasRates: callback?.offeredGasRates?.length
      ? callback.offeredGasRates
      : (fallbackTransfer?.offeredGasRates || []),
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div className="rt-page-inner">

          {/* Header Action Button */}
          <div className="rt-page-header mb-2">
            <button className="rt-back-btn" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft size={17} />
            </button>
          </div>

          {/* Top Hero Banner */}
          <div className="rt-fade rt-d1">
            <CallbackHero callback={callback} customer={customer} />
          </div>

          {/* Main Content Layout Grid */}
          <div className="rt-grid2 mt-4">

            {/* Left side: Demographics, Offers & Connections */}
            <div className="flex flex-col gap-4">
              <div className="rt-fade rt-d2">
                <CustomerInfoCard customer={customer} />
              </div>

              <div className="rt-fade rt-d4">
                <OfferedRatesCard transfer={mergedForRates} />
              </div>
            </div>

            {/* Right side: Dynamic Utility Meters & System Logs */}
            <div className="flex flex-col gap-4">
              {hasElectricity && (
                <div className="rt-fade rt-d3">
                  <MeterDetailsCard utilityType="electricity" meters={displayedElectricityMeters} />
                </div>
              )}

              {hasGas && (
                <div className="rt-fade rt-d3">
                  <MeterDetailsCard utilityType="gas" meters={customer.gasMeters} />
                </div>
              )}



              {callback.notes && (
                <DashboardCard icon={FileText} title="Interaction Notes" delay="rt-d4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {callback.notes}
                  </p>
                </DashboardCard>
              )}

              {/* Linked Records — Transfer & Sales */}
              {(linkedTransfers?.length > 0 || linkedSales?.length > 0) && (
                <DashboardCard icon={PhoneCall} title="Linked Records" delay="rt-d5">
                  <div className="flex flex-col gap-2">
                    {linkedTransfers?.map((t) => (
                      <LinkedRow
                        key={t.id}
                        icon={ArrowLeftRight}
                        iconBg="rgba(34,197,94,0.1)"
                        iconColor="#22c55e"
                        label={`Transfer #${t.id}`}
                        sub={t.status ? `Status: ${t.status}` : t.customer?.businessName}
                        onClick={() => navigate(`/transfers/${t.id}`)}
                      />
                    ))}
                    {linkedSales?.map((s) => (
                      <LinkedRow
                        key={s.id}
                        icon={PoundSterling}
                        iconBg="rgba(245,158,11,0.1)"
                        iconColor="#f59e0b"
                        label={`Sale Application #${s.id}`}
                        sub={s.ownerFullName || customer?.businessName || `Status: ${s.cotStatus || 'submitted'}`}
                        onClick={() => navigate(`/sales/${s.id}`)}
                      />
                    ))}
                  </div>
                </DashboardCard>
              )}
            </div>

          </div>

          {/* Footer Control Action Pad */}
          <div className="rt-fade rt-d6 mt-6">
            <CallbackActions
              callback={callback}
              converting={converting}
              onConvert={handleMarkAsTransfer}
              convertLabel={callback?.transferId ? 'Mark as Sale' : 'Convert to Transfer'}
              onDelete={handleDelete}
              onNotInterested={handleNotInterested}
              onReschedule={() => setShowReschedule(true)}
              onEdit={() => navigate(`/callbacks/${id}/edit`)}
            />
          </div>

          {/* Global Dialog Triggers */}
          <CallbackDialogs
            callback={callback}
            showReschedule={showReschedule}
            setShowReschedule={setShowReschedule}
            rescheduleDate={rescheduleDate}
            setRescheduleDate={setRescheduleDate}
            rescheduleTime={rescheduleTime}
            setRescheduleTime={setRescheduleTime}
            onReschedule={handleReschedule}
            showNotInterested={showNotInterested}
            setShowNotInterested={setShowNotInterested}
            notInterestedReason={notInterestedReason}
            setNotInterestedReason={setNotInterestedReason}
            onConfirmNotInterested={handleConfirmNotInterested}
          />

        </div>
      </div>
    </>
  )
}
