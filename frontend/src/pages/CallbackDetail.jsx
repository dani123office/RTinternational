import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, FileText } from 'lucide-react'

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

export default function CallbackDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isManager = user?.role === 'manager'

  const {
    callback, customer, linkedTransfers, loading, converting,
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

  const preferredMpAN = fallbackTransfer?.mpan || callback?.mpan || customer?.electricityMeters?.[0]?.supplyNumber
  const displayedElectricityMeters = preferredMpAN && hasElectricity
    ? customer.electricityMeters.map((m, index) => ({
        ...m,
        supplyNumber: index === 0 ? preferredMpAN : m.supplyNumber,
      }))
    : customer?.electricityMeters || []
  const accountDetails = {
    accountNumber: fallbackTransfer?.accountNumber || callback?.accountNumber,
    mpan: fallbackTransfer?.mpan || callback?.mpan || customer?.electricityMeters?.[0]?.supplyNumber,
    mprn: fallbackTransfer?.mprn || callback?.mprn,
    msn: fallbackTransfer?.msn || callback?.msn,
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
            <button className="rt-back-btn" onClick={() => navigate(isManager ? '/manager' : '/callbacks')} aria-label="Back">
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

              {Object.values(accountDetails).some(Boolean) && (
                <div className="rt-fade rt-d3">
                  <AccountDetailsCard transfer={accountDetails} />
                </div>
              )}

              {callback.notes && (
                <DashboardCard icon={FileText} title="Interaction Notes" delay="rt-d4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {callback.notes}
                  </p>
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
