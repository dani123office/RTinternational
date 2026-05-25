import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft, ArrowLeftRight, Loader2, Save,
  Building2, Clock, Zap, ChevronRight, User, Phone, Mail, MapPin, FileText, Calendar
} from 'lucide-react'

// Global Stores & Configurations
import { APP_STYLES } from '@/lib/styles'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { useManagerStore } from '@/store/managerStore'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toastContext'

// Form Elements & Cards UI Layers
import { Switch } from '@/components/ui/switch'
import UtilityTypeSelector from '@/components/UtilityTypeSelector'
import ElectricityMeterSection from '@/components/ElectricityMeterSection'
import GasMeterSection from '@/components/GasMeterSection'
import CommissionRateCard from '@/components/CommissionRateCard'
import NonCommissionRateCard from '@/components/NonCommissionRateCard'
import AiFormFiller from '@/components/AiFormFiller'

// ─── Data Initialization Models ─────────────────────────────────────────────
const DEFAULT_ELEC_METER = { currentSupplier:'',supplyNumber:'',dayUnitRate:'',nightUnitRate:'',eveningUnitRate:'',standingRate:'',monthlyBill:'',contractEndDate:'' }
const DEFAULT_GAS_METER  = { currentSupplier:'',unitRate:'',standingRate:'',monthlyBill:'',contractEndDate:'' }
const DEFAULT_COMMISSION     = { dayUnitRate:'',nightUnitRate:'',eveningUnitRate:'',standingRate:'' }
const DEFAULT_NON_COMMISSION = { dayUnitRate:'',nightUnitRate:'',eveningUnitRate:'',standingRate:'',brokerServiceCharge:'' }
const GAS_COMMISSION         = { dayUnitRate:'',standingRate:'' }
const GAS_NON_COMMISSION     = { dayUnitRate:'',standingRate:'',brokerServiceCharge:'' }

const getTomorrow = () => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] }
const normalizeContractEnd = (v) => {
  if (!v) return ''
  try {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch {
    /* ignore invalid contract date */
  }
  const m = String(v).match(/(\w+)\s+(\d{4})/)
  if (m) {
    const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}
    const mon = months[m[1].toLowerCase().slice(0, 3)]
    if (mon) return `${m[2]}-${mon}-01`
  }
  return v
}
const toNum  = (v) => (v===''||v==null ? null : Number.isNaN(Number(v)) ? null : Number(v))
const normDate = (v) => { if(!v) return null; const d=new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0] }

const mapMeter = (m, i) => ({
  meterNumber:i+1, currentSupplier:m.currentSupplier||null, supplyNumber:m.supplyNumber||null,
  dayUnitRate:toNum(m.dayUnitRate), nightUnitRate:toNum(m.nightUnitRate),
  eveningUnitRate:toNum(m.eveningUnitRate), standingRate:toNum(m.standingRate),
  monthlyBill:toNum(m.monthlyBill), contractEndDate:normDate(m.contractEndDate),
})
const mapGasMeter = (m, i) => ({
  meterNumber:i+1, currentSupplier:m.currentSupplier||null, unitRate:toNum(m.unitRate),
  standingRate:toNum(m.standingRate), monthlyBill:toNum(m.monthlyBill),
  contractEndDate:normDate(m.contractEndDate),
})

const initState = () => ({
  utilityType:'electricity', showOfferRates:false,
  businessName:'',addressLine1:'',city:'',businessPhone:'',ownerName:'',ownerPhone:'',email:'',postcode:'',notes:'',
  accountNumber:'', mpan:'', mprn:'', msn:'',
  dayOfWeek:'', scheduledDate:getTomorrow(), scheduledTime:'10:00',
  elecMeters:[{...DEFAULT_ELEC_METER}], gasMeters:[{...DEFAULT_GAS_METER}],
  elecCommission:{...DEFAULT_COMMISSION}, elecNonCommission:{...DEFAULT_NON_COMMISSION},
  gasCommission:{...GAS_COMMISSION}, gasNonCommission:{...GAS_NON_COMMISSION},
  elecContractLength:'1 Year', gasContractLength:'1 Year',
  elecMeterType:'Standard', elecCommissionType:'Commission',
  elecSupplier:'', gasSupplier:'',
})

// ─── Inline Styled UI Wrappers ───────────────────────────────────────────────
function DashboardCard({ icon: Icon, iconColor, iconBg, title, headerRight, children, delay }) {
  return (
    <div
      className={`rt-fade ${delay||''}`}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <div style={{background: iconBg || 'rgba(99,102,241,0.1)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon size={16} color={iconColor || '#6366f1'} />
          </div>
          <h3 style={{margin:0, fontSize:'15px', fontWeight: 700, color: '#0f172a'}}>{title}</h3>
        </div>
        {headerRight}
      </div>
      <div>{children}</div>
    </div>
  )
}

function InputField({ label, required, icon: Icon, children }) {
  return (
    <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
      <label style={{fontSize:'13px', fontWeight: 600, color: '#475569'}}>
        {label}{required && <span style={{color:'#ef4444', marginLeft:'3px'}}>*</span>}
      </label>
      <div style={{position:'relative', width:'100%'}}>
        {Icon && (
          <div style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', display:'flex', alignItems:'center'}}>
            <Icon size={15}/>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── Core Logic Hook Controller ──────────────────────────────────────────────
export default function AddCallback() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isEdit  = Boolean(id)

  const { getCurrentUserId, user } = useAuthStore()
  const isManager = user?.role === 'manager'
  const { toast } = useToast()

  const dataStore = useDataStore()
  const managerStore = useManagerStore()

  const callbacks = isManager ? managerStore.callbacks : dataStore.callbacks
  const loadCallbacks = isManager ? managerStore.loadCallbacks : dataStore.loadCallbacks
  const updateCallback = isManager ? managerStore.updateCallback : dataStore.updateCallback
  const createCallback = isManager ? managerStore.createCallback : dataStore.createCallback
  const createCustomer = dataStore.createCustomer

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => {
    const prefill = location.state?.prefillData
    if (prefill) {
      return {
        ...initState(),
        businessName: prefill.businessName || '',
        addressLine1: prefill.businessAddress?.split(',')[0]?.trim() || prefill.businessAddress || '',
        city: prefill.businessAddress?.split(',')[1]?.trim() || '',
        businessPhone: prefill.businessPhone || '',
        ownerName: prefill.ownerName || '',
        ownerPhone: prefill.ownerPhone || '',
        email: prefill.email || '',
        postcode: prefill.postcode || '',
        utilityType: prefill.utilityType || 'electricity',
        elecMeters: prefill.electricityMeters?.length
          ? prefill.electricityMeters.map((m, i) => ({
              meterNumber: m.meterNumber || i + 1,
              currentSupplier: m.currentSupplier || '',
              supplyNumber: m.supplyNumber || '',
              dayUnitRate: m.dayUnitRate?.toString() || '',
              nightUnitRate: m.nightUnitRate?.toString() || '',
              eveningUnitRate: m.eveningUnitRate?.toString() || '',
              standingRate: m.standingRate?.toString() || '',
              monthlyBill: m.monthlyBill?.toString() || '',
              contractEndDate: normDate(m.contractEndDate) || '',
            }))
          : [{...DEFAULT_ELEC_METER}],
        gasMeters: prefill.gasMeters?.length
          ? prefill.gasMeters.map((m, i) => ({
              meterNumber: m.meterNumber || i + 1,
              currentSupplier: m.currentSupplier || '',
              unitRate: m.unitRate?.toString() || '',
              standingRate: m.standingRate?.toString() || '',
              monthlyBill: m.monthlyBill?.toString() || '',
              contractEndDate: normDate(m.contractEndDate) || '',
            }))
          : [{...DEFAULT_GAS_METER}],
        accountNumber: prefill.accountNumber || '',
        mpan: prefill.mpan || '',
        mprn: prefill.mprn || '',
        msn: prefill.msn || '',
      }
    }
    return initState()
  })
  const [localCallback, setLocalCallback] = useState(null)

  const callbackData = localCallback || (isEdit ? callbacks.find((c) => c.id === Number(id)) : null)

  const upd = useCallback((field, value) => setForm((p) => ({...p, [field]:value})), [])

  useEffect(() => {
    if (isEdit && callbacks.length === 0) {
      loadCallbacks()
    }
  }, [isEdit, callbacks.length, loadCallbacks])

  useEffect(() => {
    if (!isEdit) return

    let isMounted = true
    const loadCallback = async () => {
      const found = callbacks.find((c) => c.id === Number(id))
      if (found) {
        setLocalCallback(found)
      }

      try {
        const res = await api.get(`/api/callbacks/${id}`)
        if (isMounted) {
          setLocalCallback(res.data)
        }
      } catch (err) {
        console.error("Failed to load callback:", err)
      }
    }

    loadCallback()
    return () => {
      isMounted = false
    }
  }, [id, isEdit, callbacks])

  useEffect(() => {
    if (!callbackData) return
    const c = callbackData.customer || {}
    const elecOffer = callbackData.offeredElectricityRates?.[0] || null
    const gasOffer = callbackData.offeredGasRates?.[0] || null
    const hasElecOffer = !!elecOffer
    const hasGasOffer = !!gasOffer
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((p) => ({
      ...p,
      businessName: c.businessName||'', addressLine1: c.businessAddress?.split(',')[0]?.trim()||c.businessAddress||'', city: c.businessAddress?.split(',')[1]?.trim()||'',
      businessPhone: c.businessPhone||'', ownerName: c.ownerName||'',
      ownerPhone: c.ownerPhone||'', email: c.email||'', postcode: c.postcode||'',
      notes: callbackData.notes||'',
      utilityType: c.utilityType||'electricity',
      dayOfWeek: callbackData.dayOfWeek || '',
      scheduledDate: callbackData.scheduledDateTime?.substring(0,10) || getTomorrow(),
      scheduledTime: callbackData.scheduledDateTime?.substring(11,16) || '10:00',
      showOfferRates: hasElecOffer || hasGasOffer,
      elecMeters: c.electricityMeters?.length ? c.electricityMeters.map((m, i) => ({
        meterNumber: m.meterNumber || i + 1,
        currentSupplier:m.currentSupplier||'', supplyNumber:m.supplyNumber||'',
        dayUnitRate:m.dayUnitRate?.toString()||'', nightUnitRate:m.nightUnitRate?.toString()||'',
        eveningUnitRate:m.eveningUnitRate?.toString()||'', standingRate:m.standingRate?.toString()||'',
        monthlyBill:m.monthlyBill?.toString()||'', contractEndDate:normDate(m.contractEndDate)||'',
      })) : [{...DEFAULT_ELEC_METER}],
      gasMeters: c.gasMeters?.length ? c.gasMeters.map((m, i) => ({
        meterNumber: m.meterNumber || i + 1,
        currentSupplier:m.currentSupplier||'', unitRate:m.unitRate?.toString()||'',
        standingRate:m.standingRate?.toString()||'', monthlyBill:m.monthlyBill?.toString()||'',
        contractEndDate:normDate(m.contractEndDate)||'',
      })) : [{...DEFAULT_GAS_METER}],
      elecContractLength: elecOffer?.contractLength || p.elecContractLength,
      elecSupplier: elecOffer?.supplier || p.elecSupplier,
      elecMeterType: elecOffer?.meterType || p.elecMeterType,
      elecCommissionType: elecOffer?.commissionType || p.elecCommissionType,
      elecCommission: {
        dayUnitRate: elecOffer?.dayUnitRate?.toString() || '',
        nightUnitRate: elecOffer?.nightUnitRate?.toString() || '',
        eveningUnitRate: elecOffer?.eveningUnitRate?.toString() || '',
        standingRate: elecOffer?.standingRate?.toString() || '',
      },
      elecNonCommission: {
        dayUnitRate: elecOffer?.nonCommissionDayRate?.toString() || '',
        nightUnitRate: elecOffer?.nonCommissionNightRate?.toString() || '',
        eveningUnitRate: elecOffer?.nonCommissionEveningRate?.toString() || '',
        standingRate: elecOffer?.nonCommissionStandingRate?.toString() || '',
        brokerServiceCharge: elecOffer?.brokerServiceCharge?.toString() || '',
      },
      gasContractLength: gasOffer?.contractLength || p.gasContractLength,
      gasSupplier: gasOffer?.supplier || p.gasSupplier,
      gasCommission: {
        dayUnitRate: gasOffer?.unitRate?.toString() || '',
        standingRate: gasOffer?.standingRate?.toString() || '',
      },
      gasNonCommission: {
        dayUnitRate: gasOffer?.nonCommissionUnitRate?.toString() || '',
        standingRate: gasOffer?.nonCommissionStandingRate?.toString() || '',
        brokerServiceCharge: gasOffer?.brokerServiceCharge?.toString() || '',
      },
    }))
  }, [callbackData])

  const handleAiFill = (data) => {
    setForm((p) => {
      const next = { ...p }
      if (data.businessName)    next.businessName    = data.businessName
      if (data.businessAddress) { const parts = data.businessAddress.split(','); next.addressLine1 = parts[0]?.trim() || data.businessAddress; next.city = parts[1]?.trim() || '' }
      if (data.addressLine1)    next.addressLine1    = data.addressLine1
      if (data.city)            next.city            = data.city
      if (data.businessPhone)   next.businessPhone   = data.businessPhone
      if (data.ownerPhone)      next.ownerPhone      = data.ownerPhone
      if (data.postcode)        next.postcode        = data.postcode
      if (data.ownerName)       next.ownerName       = data.ownerName
      if (data.email)           next.email           = data.email
      if (data.notes)           next.notes           = p.notes ? `${p.notes}\n${data.notes}` : data.notes
      if (data.utilityType)     next.utilityType     = data.utilityType

      if (data.electricityMeters?.length) {
        next.elecMeters = data.electricityMeters.map((m) => ({
          currentSupplier:   m.currentSupplier   || '',
          supplyNumber:      m.supplyNumber      || '',
          dayUnitRate:       m.dayUnitRate?.toString()       || '',
          nightUnitRate:     m.nightUnitRate?.toString()     || '',
          eveningUnitRate:   m.eveningUnitRate?.toString()   || '',
          standingRate:      m.standingRate?.toString()      || '',
          monthlyBill:       m.monthlyBill?.toString()       || '',
          contractEndDate:   normalizeContractEnd(m.contractEndDate) || '',
        }))
      }

      if (data.gasMeters?.length) {
        next.gasMeters = data.gasMeters.map((m) => ({
          currentSupplier:   m.currentSupplier   || '',
          unitRate:          (m.unitRate || m.dayUnitRate)?.toString() || '',
          standingRate:      m.standingRate?.toString()        || '',
          monthlyBill:       m.monthlyBill?.toString()         || '',
          contractEndDate:   normalizeContractEnd(m.contractEndDate) || '',
        }))
      }

      if (data.accountNumber) next.accountNumber = data.accountNumber
      if (data.mpan) next.mpan = data.mpan
      if (data.mprn) next.mprn = data.mprn
      if (data.msn) next.msn = data.msn

      const oe = data.offeredRates?.electricity
      const og = data.offeredRates?.gas
      const hasOffered = oe || og

      if (hasOffered) {
        next.showOfferRates = true
      }

      if (oe) {
        if (oe.commission) {
          next.elecCommission = {
            dayUnitRate: oe.commission.dayUnitRate?.toString() || '',
            nightUnitRate: oe.commission.nightUnitRate?.toString() || '',
            eveningUnitRate: oe.commission.eveningUnitRate?.toString() || '',
            standingRate: oe.commission.standingRate?.toString() || '',
          }
        }
        if (oe.nonCommission) {
          next.elecNonCommission = {
            dayUnitRate: oe.nonCommission.dayUnitRate?.toString() || '',
            nightUnitRate: oe.nonCommission.nightUnitRate?.toString() || '',
            eveningUnitRate: oe.nonCommission.eveningUnitRate?.toString() || '',
            standingRate: oe.nonCommission.standingRate?.toString() || '',
            brokerServiceCharge: data.brokerServiceCharge?.toString() || '',
          }
        }
        if (oe.contractLength) next.elecContractLength = oe.contractLength
        if (oe.supplier) next.elecSupplier = oe.supplier
        if (oe.meterType) next.elecMeterType = oe.meterType
      }

      if (og) {
        if (og.commission) {
          next.gasCommission = {
            dayUnitRate: og.commission.dayUnitRate?.toString() || '',
            standingRate: og.commission.standingRate?.toString() || '',
          }
        }
        if (og.nonCommission) {
          next.gasNonCommission = {
            dayUnitRate: og.nonCommission.dayUnitRate?.toString() || '',
            standingRate: og.nonCommission.standingRate?.toString() || '',
            brokerServiceCharge: data.brokerServiceCharge?.toString() || '',
          }
        }
        if (og.contractLength) next.gasContractLength = og.contractLength
        if (og.supplier) next.gasSupplier = og.supplier
      }

      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.businessName.trim() || !form.addressLine1.trim() || !form.city.trim() || !form.postcode.trim() || !form.businessPhone.trim()) {
      toast('Please populate all fields marked with an asterisk (*).', 'error')
      return
    }

    if (form.showOfferRates && form.utilityType !== 'gas') {
      const c = form.elecCommission, nc = form.elecNonCommission
      if (toNum(nc.dayUnitRate) > toNum(c.dayUnitRate)) { toast('Electricity non-commission Day Rate cannot exceed commission Day Rate', 'error'); return }
      if (toNum(nc.nightUnitRate) > toNum(c.nightUnitRate)) { toast('Electricity non-commission Night Rate cannot exceed commission Night Rate', 'error'); return }
      if (toNum(nc.eveningUnitRate) > toNum(c.eveningUnitRate)) { toast('Electricity non-commission Evening Rate cannot exceed commission Evening Rate', 'error'); return }
      if (toNum(nc.standingRate) > toNum(c.standingRate)) { toast('Electricity non-commission Standing Charge cannot exceed commission Standing Charge', 'error'); return }
    }
    if (form.showOfferRates && form.utilityType !== 'electricity') {
      const c = form.gasCommission, nc = form.gasNonCommission
      if (toNum(nc.dayUnitRate) > toNum(c.dayUnitRate)) { toast('Gas non-commission Unit Rate cannot exceed commission Unit Rate', 'error'); return }
      if (toNum(nc.standingRate) > toNum(c.standingRate)) { toast('Gas non-commission Standing Charge cannot exceed commission Standing Charge', 'error'); return }
    }

    setLoading(true)
    try {
      const uid = getCurrentUserId()
      if (!uid) throw new Error('Authentication failure: No current user ID identified.')

      const elecRates = form.utilityType !== 'gas'         ? form.elecMeters.map(mapMeter) : []
      const gasRates  = form.utilityType !== 'electricity' ? form.gasMeters.map(mapGasMeter) : []

      const customerPayload = {
        businessName:    form.businessName.trim(),
        businessAddress: [form.addressLine1.trim(), form.city.trim()].filter(Boolean).join(', '),
        businessPhone:   form.businessPhone.trim(),
        ownerName:       form.ownerName.trim(),
        ownerPhone:      form.ownerPhone.trim(),
        email:           form.email.trim(),
        postcode:        form.postcode.trim().toUpperCase(),
        utilityType:     form.utilityType,
        electricityRates:elecRates,
        gasRates,
        employeeId:uid,
      }

      const callbackPayload = {
        employeeId:        uid,
        scheduledDateTime: `${form.scheduledDate}T${form.scheduledTime}:00`,
        notes:             form.notes || null,
        accountNumber:     form.accountNumber || null,
        mpan:              form.mpan || null,
        mprn:              form.mprn || null,
        msn:               form.msn || null,
        offeredElectricityRates: form.showOfferRates && form.utilityType !== 'gas' ? [{
          contractLength:form.elecContractLength, supplier:form.elecSupplier||null,
          meterType:form.elecMeterType, commissionType:form.elecCommissionType,
          dayUnitRate:toNum(form.elecCommission.dayUnitRate), nightUnitRate:toNum(form.elecCommission.nightUnitRate),
          eveningUnitRate:toNum(form.elecCommission.eveningUnitRate), standingRate:toNum(form.elecCommission.standingRate),
          nonCommissionDayRate:toNum(form.elecNonCommission.dayUnitRate), nonCommissionNightRate:toNum(form.elecNonCommission.nightUnitRate),
          nonCommissionEveningRate:toNum(form.elecNonCommission.eveningUnitRate), nonCommissionStandingRate:toNum(form.elecNonCommission.standingRate),
          brokerServiceCharge:toNum(form.elecNonCommission.brokerServiceCharge),
        }] : [],
        offeredGasRates: form.showOfferRates && form.utilityType !== 'electricity' ? [{
          contractLength:form.gasContractLength, supplier:form.gasSupplier||null,
          unitRate:toNum(form.gasCommission.dayUnitRate), standingRate:toNum(form.gasCommission.standingRate),
          nonCommissionUnitRate:toNum(form.gasNonCommission.dayUnitRate), nonCommissionStandingRate:toNum(form.gasNonCommission.standingRate),
          brokerServiceCharge:toNum(form.gasNonCommission.brokerServiceCharge),
        }] : [],
      }

      if (isEdit) {
        await updateCallback(Number(id), {...customerPayload, ...callbackPayload})
      } else {
        const customer = await createCustomer(customerPayload)
        await createCallback({ customerId:customer.id, ...callbackPayload })
      }

      await loadCallbacks()
      navigate(isManager ? '/manager/callbacks' : '/callbacks')
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || 'An unexpected runtime data error occurred.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page" style={{paddingBottom: '60px'}}>
        <div style={{maxWidth:'680px', margin:'0 auto'}}>

          {/* ── Dynamic Layout Header Row ── */}
          <div style={{display:'flex', flexDirection:'column', gap:'20px', marginBottom:'24px'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <button type="button" className="rt-back-btn" onClick={() => navigate(isManager ? '/manager/callbacks' : '/callbacks')}>
                  <ArrowLeft size={17}/>
                </button>
                <div>
                  <h1 style={{fontSize:'22px', fontWeight:850, color:'#0f172a', margin:0, letterSpacing:'-0.5px'}}>
                    {isEdit ? 'Edit Callback' : 'Add Callback'}
                  </h1>
                  <p style={{fontSize:'13px', color:'#64748b', margin:'2px 0 0'}}>
                    {isEdit ? 'Modify scheduled call parameters' : 'Configure pipeline prospect records'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Assistant Placement Vector */}
            <AiFormFiller onFill={handleAiFill}/>
          </div>

          <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'4px'}}>

            {/* Business Information Card */}
            <DashboardCard icon={Building2} iconColor="#4f46e5" iconBg="#f5f3ff" title="Business Details" delay="rt-d1">
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                <div style={{gridColumn:'span 2'}}><InputField label="Business Name" required icon={Building2}><input className="rt-input" style={{paddingLeft: '38px'}} value={form.businessName} onChange={(e)=>upd('businessName',e.target.value)}/></InputField></div>
                <div style={{gridColumn:'span 2'}}><InputField label="Address Line 1" required icon={MapPin}><input className="rt-input" style={{paddingLeft: '38px'}} value={form.addressLine1} onChange={(e)=>upd('addressLine1',e.target.value)}/></InputField></div>
                <div><InputField label="City" required><input className="rt-input" value={form.city} onChange={(e)=>upd('city',e.target.value)}/></InputField></div>
                <div><InputField label="Postcode" required><input className="rt-input" value={form.postcode} onChange={(e)=>upd('postcode',e.target.value)}/></InputField></div>
                <div><InputField label="Business Phone" required icon={Phone}><input className="rt-input" style={{paddingLeft: '38px'}} value={form.businessPhone} onChange={(e)=>upd('businessPhone',e.target.value)}/></InputField></div>
                <div><InputField label="Email Address" icon={Mail}><input className="rt-input" style={{paddingLeft: '38px'}} type="email" value={form.email} onChange={(e)=>upd('email',e.target.value)}/></InputField></div>
                <div><InputField label="Decision Maker / Owner" icon={User}><input className="rt-input" style={{paddingLeft: '38px'}} value={form.ownerName} onChange={(e)=>upd('ownerName',e.target.value)}/></InputField></div>
                <div style={{gridColumn:'span 2'}}><InputField label="Owner Direct Phone" icon={Phone}><input className="rt-input" style={{paddingLeft: '38px'}} value={form.ownerPhone} onChange={(e)=>upd('ownerPhone',e.target.value)}/></InputField></div>
                <div style={{gridColumn:'span 2'}}><InputField label="Call Notes Log" icon={FileText}><textarea className="rt-textarea" style={{minHeight:'80px'}} value={form.notes} onChange={(e)=>upd('notes',e.target.value)}/></InputField></div>
              </div>
            </DashboardCard>

            {/* Schedule Setup Card */}
            <DashboardCard icon={Clock} iconColor="#d97706" iconBg="#fef3c7" title="Schedule Callback" delay="rt-d2">
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                <div>
                  <InputField label="Target Date" required icon={Calendar}>
                    <input className="rt-input" style={{paddingLeft: '38px'}} type="date" value={form.scheduledDate} onChange={(e)=>upd('scheduledDate',e.target.value)}/>
                  </InputField>
                </div>
                <div>
                  <InputField label="Target Window Time" required icon={Clock}>
                    <input className="rt-input" style={{paddingLeft: '38px'}} type="time" value={form.scheduledTime} onChange={(e)=>upd('scheduledTime',e.target.value)}/>
                  </InputField>
                </div>
              </div>
            </DashboardCard>

            {/* Utility Meter Selection Blocks */}
            <DashboardCard icon={Zap} iconColor="#16a34a" iconBg="#dcfce7" title="Utility Infrastructure Profiles" delay="rt-d3">
              <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                <UtilityTypeSelector value={form.utilityType} onChange={(v)=>upd('utilityType',v)}/>
                {(form.utilityType==='electricity'||form.utilityType==='both') && (
                  <ElectricityMeterSection
                    meters={form.elecMeters}
                    onUpdate={(v)=>upd('elecMeters',v)}
                    onAdd={()=>upd('elecMeters',[...form.elecMeters,{...DEFAULT_ELEC_METER}])}
                    onRemove={(i)=>upd('elecMeters',form.elecMeters.filter((_,j)=>j!==i))}
                  />
                )}
                {(form.utilityType==='gas'||form.utilityType==='both') && (
                  <GasMeterSection
                    meters={form.gasMeters}
                    onUpdate={(v)=>upd('gasMeters',v)}
                    onAdd={()=>upd('gasMeters',[...form.gasMeters,{...DEFAULT_GAS_METER}])}
                    onRemove={(i)=>upd('gasMeters',form.gasMeters.filter((_,j)=>j!==i))}
                  />
                )}
              </div>
            </DashboardCard>

            <DashboardCard icon={FileText} iconColor="#0891b2" iconBg="#eff6ff" title="Additional Meter Details" delay="rt-d4">
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                {(form.utilityType==='electricity'||form.utilityType==='both') && (
                  <>
                    <div><InputField label="MPAN (Supply Number)"><input className="rt-input" value={form.mpan} onChange={(e)=>upd('mpan',e.target.value)} placeholder="e.g. 04 1234 5678 901"/></InputField></div>
                    <div><InputField label="MSN (Meter Serial No)"><input className="rt-input" value={form.msn} onChange={(e)=>upd('msn',e.target.value)} placeholder="e.g. 12A3456789"/></InputField></div>
                  </>
                )}
                {(form.utilityType==='gas'||form.utilityType==='both') && (
                  <div><InputField label="MPRN"><input className="rt-input" value={form.mprn} onChange={(e)=>upd('mprn',e.target.value)} placeholder="e.g. 1234567890"/></InputField></div>
                )}
                <div><InputField label="Account Number"><input className="rt-input" value={form.accountNumber} onChange={(e)=>upd('accountNumber',e.target.value)} placeholder="e.g. AC12345678"/></InputField></div>
              </div>
            </DashboardCard>

            {/* Offer Rates Segment */}
            <DashboardCard
              icon={ChevronRight}
              iconColor="#7c3aed"
              iconBg="#f5f3ff"
              title="Pipeline Offer Rates Matrix"
              delay="rt-d4"
              headerRight={
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{fontSize:'12px', fontWeight:600, color:'#64748b'}}>Include Rates Matrix</span>
                  <Switch checked={form.showOfferRates} onCheckedChange={(v)=>upd('showOfferRates',v)}/>
                </div>
              }
            >
              {form.showOfferRates ? (
                <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                  {(form.utilityType==='electricity'||form.utilityType==='both') && (
                    <>
                      <div className="rt-grid2">
                        <div className="rt-span2">
                          <InputField label="Offered Supplier (Electricity)">
                            <input className="rt-input" value={form.elecSupplier} onChange={(e)=>upd('elecSupplier',e.target.value)} placeholder="e.g. British Gas"/>
                          </InputField>
                        </div>
                      </div>
                      <div className="rt-grid2">
                        <div>
                          <InputField label="Contract Length">
                            <select className="rt-input" value={form.elecContractLength} onChange={(e)=>upd('elecContractLength',e.target.value)}>
                              <option value="1 Year">1 Year</option>
                              <option value="2 Years">2 Years</option>
                              <option value="3 Years">3 Years</option>
                              <option value="4 Years">4 Years</option>
                              <option value="5 Years">5 Years</option>
                            </select>
                          </InputField>
                        </div>
                        <div>
                          <InputField label="Meter Type">
                            <select className="rt-input" value={form.elecMeterType} onChange={(e)=>upd('elecMeterType',e.target.value)}>
                              <option value="Standard">Standard</option>
                              <option value="Day/Night">Day/Night</option>
                              <option value="Half Hourly">Half Hourly</option>
                            </select>
                          </InputField>
                        </div>
                      </div>
                      <div className="rt-grid2">
                        <div>
                          <InputField label="Commission Type">
                            <select className="rt-input" value={form.elecCommissionType} onChange={(e)=>upd('elecCommissionType',e.target.value)}>
                              <option value="Commission">Commission</option>
                              <option value="Non-Commission">Non-Commission</option>
                            </select>
                          </InputField>
                        </div>
                      </div>
                      <CommissionRateCard    title="Electricity Commission Rates"     rates={form.elecCommission}    onUpdate={(v)=>upd('elecCommission',v)}    type="electricity"/>
                      <NonCommissionRateCard title="Electricity Non-Commission Rates" rates={form.elecNonCommission} onUpdate={(v)=>upd('elecNonCommission',v)} type="electricity"/>
                    </>
                  )}
                  {(form.utilityType==='gas'||form.utilityType==='both') && (
                    <>
                      <div className="rt-grid2">
                        <div className="rt-span2">
                          <InputField label="Offered Supplier (Gas)">
                            <input className="rt-input" value={form.gasSupplier} onChange={(e)=>upd('gasSupplier',e.target.value)} placeholder="e.g. British Gas"/>
                          </InputField>
                        </div>
                      </div>
                      <div className="rt-grid2">
                        <div>
                          <InputField label="Contract Length">
                            <select className="rt-input" value={form.gasContractLength} onChange={(e)=>upd('gasContractLength',e.target.value)}>
                              <option value="1 Year">1 Year</option>
                              <option value="2 Years">2 Years</option>
                              <option value="3 Years">3 Years</option>
                              <option value="4 Years">4 Years</option>
                              <option value="5 Years">5 Years</option>
                            </select>
                          </InputField>
                        </div>
                      </div>
                      <CommissionRateCard    title="Gas Commission Rates"     rates={form.gasCommission}    onUpdate={(v)=>upd('gasCommission',v)}    type="gas"/>
                      <NonCommissionRateCard title="Gas Non-Commission Rates" rates={form.gasNonCommission} onUpdate={(v)=>upd('gasNonCommission',v)} type="gas"/>
                    </>
                  )}
                </div>
              ) : (
                <p style={{color:'#94a3b8', fontSize:'13px', margin:0, fontStyle:'italic'}}>
                  Toggle options above if you wish to initialize current broker contract conversion parameters.
                </p>
              )}
            </DashboardCard>

            {/* Submission Controls Control Deck */}
            <div style={{display:'flex', itemsCenter:'center', justifyContent:'flex-end', gap:'12px', pt:'12px', borderTop:'1px solid #e2e8f0', marginTop:'12px'}}>
              {form.showOfferRates && (
                <button
                  type="button"
                  onClick={() => navigate('/transfers/add', { state:{ fromCallback:true, prefillData:{...form} } })}
                  style={{padding:'10px 16px', background:'#ffffff', border:'1px solid #cbd5e1', color:'#334155', borderRadius:'12px', fontWeight:600, fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px'}}
                >
                  <ArrowLeftRight size={15}/>
                  Transfer Direct
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{padding:'10px 20px', background:'#4f46e5', border:'none', color:'#ffffff', borderRadius:'12px', fontWeight:700, fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', boxShadow:'0 1px 3px rgba(79,70,229,0.2)'}}
              >
                {loading ? (
                  <><Loader2 size={15} className="rt-spin"/> Synchronizing...</>
                ) : (
                  <><Save size={15}/> {isEdit ? 'Update Lead Record' : 'Commit Configuration'}</>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}
