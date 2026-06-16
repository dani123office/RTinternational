import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Save,
  Building2, Clock, Zap, User, Phone, Mail, MapPin, FileText, Calendar
} from 'lucide-react'

// Global Stores & Configurations
import { APP_STYLES } from '@/lib/styles'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { useManagerStore } from '@/store/managerStore'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toastContext'

// Form Elements & Cards UI Layers
import UtilityTypeSelector from '@/components/UtilityTypeSelector'
import ElectricityMeterSection from '@/components/ElectricityMeterSection'
import GasMeterSection from '@/components/GasMeterSection'
import AiFormFiller from '@/components/AiFormFiller'

// ─── Data Initialization Models ─────────────────────────────────────────────
const DEFAULT_ELEC_METER = { currentSupplier:'',supplyNumber:'',dayUnitRate:'',nightUnitRate:'',eveningUnitRate:'',standingRate:'',monthlyBill:'',contractEndDate:'' }
const DEFAULT_GAS_METER  = { currentSupplier:'',mprn:'',unitRate:'',standingRate:'',monthlyBill:'',contractEndDate:'' }

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
  utilityType:'electricity',
  businessName:'',addressLine1:'',city:'',businessPhone:'',ownerName:'',ownerPhone:'',email:'',postcode:'',notes:'',
  accountNumber:'', mpan:'', mprn:'', msn:'',
  dayOfWeek:'', scheduledDate:getTomorrow(), scheduledTime:'10:00',
  elecMeters:[{...DEFAULT_ELEC_METER}], gasMeters:[{...DEFAULT_GAS_METER}],
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
  const transfers = isManager ? managerStore.transfers : dataStore.transfers

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
              mprn: m.mprn || '',
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
  const linkedTransfer = callbackData?.transferId
    ? transfers.find((t) => t.id === callbackData.transferId)
    : null

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((p) => ({
      ...p,
      businessName: c.businessName||'', addressLine1: c.businessAddress?.split(',')[0]?.trim()||c.businessAddress||'', city: c.businessAddress?.split(',')[1]?.trim()||'',
      businessPhone: c.businessPhone||'', ownerName: c.ownerName||'',
      ownerPhone: c.ownerPhone||'', email: c.email||'', postcode: c.postcode||'',
      notes: callbackData.notes||'',
      utilityType: c.utilityType||'electricity',
      accountNumber: callbackData.accountNumber || callbackData.linkedTransferAccountNumber || '',
      mpan: callbackData.mpan || callbackData.linkedTransferMpan || '',
      mprn: callbackData.mprn || callbackData.linkedTransferMprn || '',
      msn: callbackData.msn || callbackData.linkedTransferMsn || '',
      dayOfWeek: callbackData.dayOfWeek || '',
      scheduledDate: callbackData.scheduledDateTime?.substring(0,10) || getTomorrow(),
      scheduledTime: callbackData.scheduledDateTime?.substring(11,16) || '10:00',
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
          mprn:              m.mprn             || '',
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

      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.businessName.trim() || !form.addressLine1.trim() || !form.city.trim() || !form.postcode.trim() || !form.businessPhone.trim()) {
      toast('Please populate all fields marked with an asterisk (*).', 'error')
      return
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

      const firstElectricitySupply = form.utilityType !== 'gas'
        ? form.elecMeters?.[0]?.supplyNumber?.trim() || form.mpan?.trim() || null
        : null

      const callbackPayload = {
        employeeId:        uid,
        scheduledDateTime: `${form.scheduledDate}T${form.scheduledTime}:00`,
        notes:             form.notes || null,
        accountNumber:     form.accountNumber || null,
        mpan:              firstElectricitySupply,
        mprn:              form.gasMeters?.[0]?.mprn || form.mprn || null,
        msn:               form.msn || null,
      }

      if (isEdit) {
        await updateCallback(Number(id), {...customerPayload, ...callbackPayload})
        // Sync customer business info to the shared customer record so linked transfers/sales also reflect changes
        const customerId = callbackData?.customerId || callbackData?.customer?.id
        if (customerId) {
          await api.put(`/api/customers/${customerId}`, customerPayload).catch(() => {})
        }
        // Sync account details to linked transfer
        if (callbackData?.transferId) {
          const firstGasMprn = form.gasMeters?.[0]?.mprn || form.mprn
          await api.put(`/api/transfers/${callbackData.transferId}`, {
            accountNumber: form.accountNumber || undefined,
            mpan: firstElectricitySupply || undefined,
            mprn: firstGasMprn || undefined,
            msn: form.msn || undefined,
          }).catch(() => {})
        }
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
                    <div><InputField label="MSN (Meter Serial No)"><input className="rt-input" value={form.msn} onChange={(e)=>upd('msn',e.target.value)} placeholder="e.g. 12A3456789"/></InputField></div>
                  </>
                )}
                        <div><InputField label="Account Number"><input className="rt-input" value={form.accountNumber} onChange={(e)=>upd('accountNumber',e.target.value)} placeholder="e.g. AC12345678"/></InputField></div>
              </div>
            </DashboardCard>

            <div style={{display:'flex', justifyContent:'flex-end', gap:'12px', paddingTop:'12px', borderTop:'1px solid #e2e8f0', marginTop:'12px'}}>
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
