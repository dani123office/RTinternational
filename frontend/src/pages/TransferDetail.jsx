import { Loader2, ArrowLeft, FileText, PhoneCall, PoundSterling, ArrowLeftRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { APP_STYLES } from '@/lib/styles'
import { useTransferDetail } from '@/hooks/useTransferDetail'
import TransferHero from '@/components/transfer/TransferHero'
import TransferActions from '@/components/transfer/TransferActions'
import TransferDialogs from '@/components/transfer/TransferDialogs'
import CustomerInfoCard from '@/components/shared/CustomerInfoCard'
import AccountDetailsCard from '@/components/shared/AccountDetailsCard'
import MeterDetailsCard from '@/components/shared/MeterDetailsCard'
import OfferedRatesCard from '@/components/shared/OfferedRatesCard'
import { formatDateTime } from '@/lib/formatters'

function Card({ icon: Icon, iconColor, iconBg, title, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay || ''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon" style={{background: iconBg || 'rgba(99,102,241,0.15)'}}>
            <Icon size={16} color={iconColor || '#6366f1'} />
          </div>
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

export default function TransferDetail() {
  const navigate = useNavigate()
  const {
    transfer,
    linkedSales,
    linkedCallback,
    showSchedule, setShowSchedule,
    showReschedule, setShowReschedule,
    showDelete, setShowDelete,
    showNotInterested, setShowNotInterested,
    notInterestedReason, setNotInterestedReason,
    saving,
    handleDelete, handleMarkAsSale, handleReschedule, handleScheduleAsCallback,
    handleNotInterested, handleConfirmNotInterested,
  } = useTransferDetail()

  if (!transfer) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="rt-card" style={{ padding: '40px' }}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 rt-spin" color="#6366f1" />
                <p className="text-sm text-gray-500 font-medium">Loading transfer...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const customer = transfer.customer || {}

  // Build unified account details — prefer transfer-level fields over customer meter fields
  const accountDetails = {
    accountNumber: transfer.accountNumber,
    mpan: transfer.mpan || customer.electricityMeters?.[0]?.supplyNumber,
    mprn: transfer.mprn,
    msn: transfer.msn,
  }
  const hasAccountDetails = Object.values(accountDetails).some(Boolean)

  const hasLinked = linkedCallback || (linkedSales && linkedSales.length > 0)

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{maxWidth:'960px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'16px'}}>

          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'4px'}}>
            <button className="rt-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={17}/>
            </button>
          </div>

          <div className="rt-fade rt-d1">
            <TransferHero transfer={transfer} customer={customer} />
          </div>

          {/* Customer Info */}
          <div className="rt-fade rt-d2">
            <CustomerInfoCard customer={customer} />
          </div>

          {/* Account Details (transfer-level) */}
          {hasAccountDetails && (
            <div className="rt-fade rt-d3">
              <AccountDetailsCard transfer={accountDetails} />
            </div>
          )}

          {/* Meter Details grid */}
          <div className="rt-grid2">
            <div className="rt-fade rt-d3">
              <MeterDetailsCard utilityType="electricity" meters={customer.electricityMeters} />
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <div className="rt-fade rt-d4">
                <MeterDetailsCard utilityType="gas" meters={customer.gasMeters} />
              </div>
            </div>
          </div>

          {/* Notes */}
          {transfer.notes && (
            <Card icon={FileText} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title="Notes" delay="rt-d4">
              <p style={{color:'#334155',fontSize:'13.5px',whiteSpace:'pre-wrap',lineHeight:1.7,margin:0}}>{transfer.notes}</p>
            </Card>
          )}

          {/* Offered Rates */}
          <div className="rt-fade rt-d5">
            <OfferedRatesCard transfer={transfer} />
          </div>

          {/* Linked Records — Callback & Sales */}
          {hasLinked && (
            <Card icon={PhoneCall} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title="Linked Records" delay="rt-d5">
              <div className="flex flex-col gap-2">
                {linkedCallback && (
                  <LinkedRow
                    icon={PhoneCall}
                    iconBg="rgba(99,102,241,0.1)"
                    iconColor="#6366f1"
                    label={`Callback #${linkedCallback.id}`}
                    sub={linkedCallback.scheduledDateTime
                      ? `Scheduled: ${formatDateTime(linkedCallback.scheduledDateTime)}`
                      : linkedCallback.customer?.businessName}
                    onClick={() => navigate(`/callbacks/${linkedCallback.id}`)}
                  />
                )}
                {linkedSales?.map((s) => (
                  <LinkedRow
                    key={s.id}
                    icon={PoundSterling}
                    iconBg="rgba(245,158,11,0.1)"
                    iconColor="#f59e0b"
                    label={`Sale Application #${s.id}`}
                    sub={s.ownerFullName || customer.businessName || `Status: ${s.cotStatus || 'submitted'}`}
                    onClick={() => navigate(`/sales/${s.id}`)}
                  />
                ))}
              </div>
            </Card>
          )}

          <div className="rt-fade rt-d6">
            <TransferActions
              transfer={transfer}
              onReschedule={() => setShowReschedule(true)}
              onMarkAsSale={handleMarkAsSale}
              onScheduleCallback={() => setShowSchedule(true)}
              onDelete={() => setShowDelete(true)}
              onEdit={() => navigate(`/transfers/${transfer.id}/edit`)}
              onNotInterested={handleNotInterested}
            />
          </div>

          <TransferDialogs
            transfer={transfer}
            showReschedule={showReschedule}
            setShowReschedule={setShowReschedule}
            showScheduleCallback={showSchedule}
            setShowScheduleCallback={setShowSchedule}
            showDelete={showDelete}
            setShowDelete={setShowDelete}
            onReschedule={handleReschedule}
            onScheduleCallback={handleScheduleAsCallback}
            onDelete={handleDelete}
            saving={saving}
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
