import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { APP_STYLES } from '@/lib/styles'
import { ArrowLeft, Building2, Zap, FileText, Loader2, Save, Calendar, Clock } from 'lucide-react'
import { useDataStore } from '@/store/dataStore'
import { useToast } from '@/components/ui/toastContext'
import { Switch } from '@/components/ui/switch'
import UtilityTypeSelector from '@/components/UtilityTypeSelector'
import ElectricityMeterSection from '@/components/ElectricityMeterSection'
import GasMeterSection from '@/components/GasMeterSection'
import { DEFAULT_ELEC_METER, DEFAULT_GAS_METER } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

const toNum = (v) => (v === '' || v == null ? null : Number.isNaN(Number(v)) ? null : Number(v))

function Card({ icon: Icon, title, headerRight, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay || ''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><Icon size={16} /></div>
          <span className="rt-card-title">{title}</span>
        </div>
        {headerRight}
      </div>
      <div className="rt-card-body">{children}</div>
    </div>
  )
}

function Field({ label, required, icon: Icon, children }) {
  return (
    <div>
      <label className="rt-label">{label}{required && <span className="rt-required">*</span>}</label>
      <div style={{ position: 'relative', width: '100%' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <Icon size={15} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function meterToEditForm(m, i) {
  return {
    meterNumber: m.meterNumber || i + 1,
    currentSupplier: m.currentSupplier || '',
    supplyNumber: m.supplyNumber || '',
    dayUnitRate: m.dayUnitRate?.toString() || '',
    nightUnitRate: m.nightUnitRate?.toString() || '',
    eveningUnitRate: m.eveningUnitRate?.toString() || '',
    standingRate: m.standingRate?.toString() || '',
    monthlyBill: m.monthlyBill?.toString() || '',
    contractEndDate: typeof m.contractEndDate === 'string' ? m.contractEndDate.substring(0, 10) : m.contractEndDate || '',
  }
}

function gasMeterToEditForm(m, i) {
  return {
    meterNumber: m.meterNumber || i + 1,
    currentSupplier: m.currentSupplier || '',
    unitRate: m.unitRate?.toString() || '',
    standingRate: m.standingRate?.toString() || '',
    monthlyBill: m.monthlyBill?.toString() || '',
    contractEndDate: typeof m.contractEndDate === 'string' ? m.contractEndDate.substring(0, 10) : m.contractEndDate || '',
  }
}

export default function EditTransfer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { transfers, updateTransfer, updateCustomer, loadTransfers, createCallback } = useDataStore()
  const [saving, setSaving] = useState(false)
  const { user } = useAuthStore()
  const isManager = user?.role === 'manager'

  const [localTransfer, setLocalTransfer] = useState(null)
  const [, setLoading] = useState(true)
  const transferId = Number(id)
  const transfer = localTransfer
  const customer = transfer?.customer || {}

  const [form, setForm] = useState({
    businessName: '',
    businessPhone: '',
    businessAddress: '',
    addressLine1: '',
    city: '',
    postcode: '',
    ownerName: '',
    ownerPhone: '',
    email: '',
    utilityType: 'electricity',
    elecMeters: [{ ...DEFAULT_ELEC_METER }],
    gasMeters: [{ ...DEFAULT_GAS_METER }],
    mpan: '',
    mprn: '',
    msn: '',
    supplier: '',
    status: '',
    notes: '',
    date: '',
    time: '',
    day: '',
    scheduleAsCallback: false,
  })

  const populateForm = (t) => {
    if (!t) return
    const cust = t.customer || {}

    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

    const elecMeters = (cust.electricityMeters || []).length
      ? cust.electricityMeters.map(m => ({ ...meterToEditForm(m), currentSupplier: capitalize(m.currentSupplier) }))
      : [{ ...DEFAULT_ELEC_METER }]

    const gasMeters = (cust.gasMeters || []).length
      ? cust.gasMeters.map(m => ({ ...gasMeterToEditForm(m), currentSupplier: capitalize(m.currentSupplier) }))
      : [{ ...DEFAULT_GAS_METER }]

    const rawAddress = cust.businessAddress || ''
    const rawPostcode = cust.postcode || ''
    let cleanAddress = rawAddress
    if (rawPostcode && cleanAddress.toUpperCase().endsWith(rawPostcode.toUpperCase())) {
      cleanAddress = cleanAddress.slice(0, -rawPostcode.length).replace(/[,.\s]+$/, '')
    }
    const addrParts = cleanAddress.split(',').map(s => s.trim()).filter(Boolean)
    const addrLine1 = addrParts[0] || cleanAddress
    const addrCity = addrParts.length > 1 ? addrParts.slice(1).join(', ') : ''

    setForm({
      businessName: cust.businessName || '',
      businessPhone: cust.businessPhone || '',
      businessAddress: cleanAddress,
      addressLine1: addrLine1,
      city: addrCity,
      postcode: rawPostcode,
      ownerName: cust.ownerName || '',
      ownerPhone: cust.ownerPhone || '',
      email: cust.email || '',
      utilityType: t.utilityType || 'electricity',
      elecMeters,
      gasMeters,
      mpan: t.mpan || '',
      mprn: t.mprn || '',
      msn: t.msn || '',
      supplier: t.supplier || '',
      status: t.status || '',
      notes: t.notes || '',
      date: t.scheduledDateTime?.substring(0, 10) || '',
      time: t.scheduledDateTime?.substring(11, 16) || '',
      day: '',
      scheduleAsCallback: !!t.callBackId,
    })
  }

  useEffect(() => {
    let isMounted = true
    const loadTransfer = async () => {
      setLoading(true)

      const storeTransfer = transfers.find(t => t.id === transferId)
      if (storeTransfer) {
        setLocalTransfer(storeTransfer)
        populateForm(storeTransfer)
        setLoading(false)
      }

      try {
        const res = await api.get(`/api/transfers/${transferId}`)
        if (!isMounted) return
        const t = res.data
        setLocalTransfer(t)
        populateForm(t)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load transfer details:', err)
        if (isMounted && !storeTransfer) {
          toast('Failed to load transfer details', 'error')
          setLoading(false)
        }
      }
    }

    loadTransfer()
    return () => {
      isMounted = false
    }
  }, [transferId, transfers, toast])

  const setField = (field, value) => setForm(p => ({ ...p, [field]: value }))

  const addElectricityMeter = () => setForm(p => ({ ...p, elecMeters: [...p.elecMeters, { ...DEFAULT_ELEC_METER }] }))
  const removeElectricityMeter = (idx) => setForm(p => ({ ...p, elecMeters: p.elecMeters.filter((_, i) => i !== idx) }))
  const addGasMeter = () => setForm(p => ({ ...p, gasMeters: [...p.gasMeters, { ...DEFAULT_GAS_METER }] }))
  const removeGasMeter = (idx) => setForm(p => ({ ...p, gasMeters: p.gasMeters.filter((_, i) => i !== idx) }))


  const validate = () => {
    if (!form.businessName.trim()) { toast('Business name is required', 'error'); return false }
    if (!form.businessPhone.trim()) { toast('Business phone is required', 'error'); return false }
    if (!form.addressLine1.trim()) { toast('Address line 1 is required', 'error'); return false }
    if (!form.city.trim()) { toast('City is required', 'error'); return false }
    if (!form.postcode.trim()) { toast('Postcode is required', 'error'); return false }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const transferId = Number(id)

      const elecMetersData = form.utilityType !== 'gas'
        ? form.elecMeters.map((m, i) => ({
            meterNumber: i + 1,
            currentSupplier: m.currentSupplier || null,
            supplyNumber: m.supplyNumber || null,
            dayUnitRate: toNum(m.dayUnitRate),
            nightUnitRate: toNum(m.nightUnitRate),
            eveningUnitRate: toNum(m.eveningUnitRate),
            standingRate: toNum(m.standingRate),
            monthlyBill: toNum(m.monthlyBill),
            contractEndDate: m.contractEndDate || null,
          }))
        : []

      const gasMetersData = form.utilityType !== 'electricity'
        ? form.gasMeters.map((m, i) => ({
            meterNumber: i + 1,
            currentSupplier: m.currentSupplier || null,
            unitRate: toNum(m.unitRate),
            standingRate: toNum(m.standingRate),
            monthlyBill: toNum(m.monthlyBill),
            contractEndDate: m.contractEndDate || null,
          }))
        : []

      const joinedAddress = [form.addressLine1.trim(), form.city.trim()].filter(Boolean).join(', ')

      await Promise.all([
        updateCustomer(customer.id, {
          businessName: form.businessName.trim(),
          businessPhone: form.businessPhone.trim(),
          businessAddress: joinedAddress || form.businessAddress.trim(),
          postcode: form.postcode.trim().toUpperCase(),
          ownerName: form.ownerName.trim(),
          ownerPhone: form.ownerPhone.trim(),
          email: form.email.trim(),
          utilityType: form.utilityType,
          electricityRates: elecMetersData,
          gasRates: gasMetersData,
        }),
      ])

      const transferMpan = form.utilityType !== 'gas' ? form.elecMeters?.[0]?.supplyNumber || form.mpan : null
      const transferMprn = form.gasMeters?.[0]?.mprn || form.mprn
      const transferPayload = {
        utilityType: form.utilityType || undefined,
        supplier: form.supplier || undefined,
        status: form.status || undefined,
        mpan: transferMpan || undefined,
        mprn: transferMprn || undefined,
        msn: form.msn || undefined,
        notes: form.notes || undefined,
      }

      if (form.day) transferPayload.dayOfWeek = form.day

      await updateTransfer(transferId, transferPayload)

      if (form.scheduleAsCallback && form.date && form.time) {
        await createCallback({
          customerId: customer.id,
          scheduledDateTime: `${form.date}T${form.time}:00`,
          notes: form.notes || null,
        })
      }

      await loadTransfers()
      toast('Transfer updated successfully', 'success')
      navigate(isManager ? `/manager/transfers/${id}` : `/transfers/${id}`)
    } catch (err) {
      toast(err?.response?.data?.detail || 'Failed to update transfer', 'error')
    } finally {
      setSaving(false)
    }
  }

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

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
            <button className="rt-back-btn" onClick={() => navigate(isManager ? `/manager/transfers/${id}` : `/transfers/${id}`)}>
              <ArrowLeft size={17} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
                Edit Transfer
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>
                Update the transfer record details
              </p>
            </div>
            {transfer.agentName && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted By</p>
                <p style={{ fontSize: '14px', color: '#0f172a', margin: '2px 0 0', fontWeight: 600, textTransform: 'capitalize' }}>{transfer.agentName}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="rt-section-gap">

            <Card icon={Building2} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title={isManager ? 'Business Information & Status' : 'Business Information'} delay="rt-d1">
              <div className="rt-grid2">
                {isManager && (
                  <div className="rt-span2">
                    <Field label="Status">
                      <select className="rt-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                        <option value="">Select status...</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="chasing">Chasing</option>
                        <option value="cotInProgress">COT In Progress</option>
                        <option value="hold">On Hold</option>
                      </select>
                    </Field>
                  </div>
                )}
                <div className="rt-span2">
                  <Field label="Business Name" required>
                    <input className="rt-input" placeholder="e.g. Acme Corp Ltd" value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Business Phone" required>
                    <input className="rt-input" placeholder="e.g. 01234 567890" value={form.businessPhone} onChange={(e) => setField('businessPhone', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Address Line 1" required>
                    <input className="rt-input" placeholder="e.g. 123 High Street" value={form.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="City" required>
                    <input className="rt-input" placeholder="e.g. London" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Postcode" required>
                    <input className="rt-input" placeholder="e.g. SW1A 1AA" value={form.postcode} onChange={(e) => setField('postcode', e.target.value.toUpperCase())} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Owner Name">
                    <input className="rt-input" placeholder="e.g. John Smith" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Owner Direct Phone">
                    <input className="rt-input" placeholder="e.g. 07712 345678" value={form.ownerPhone} onChange={(e) => setField('ownerPhone', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Email">
                    <input className="rt-input" type="email" placeholder="e.g. info@acmecorp.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>

            <Card icon={Zap} iconColor="#22c55e" iconBg="rgba(34,197,94,0.15)" title="Meter Details" delay="rt-d2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <UtilityTypeSelector value={form.utilityType} onChange={(v) => setField('utilityType', v)} />
                {(form.utilityType === 'electricity' || form.utilityType === 'both') && (
                  <ElectricityMeterSection meters={form.elecMeters} onUpdate={(v) => setField('elecMeters', v)} onAdd={addElectricityMeter} onRemove={removeElectricityMeter} />
                )}
                {(form.utilityType === 'gas' || form.utilityType === 'both') && (
                  <GasMeterSection meters={form.gasMeters} onUpdate={(v) => setField('gasMeters', v)} onAdd={addGasMeter} onRemove={removeGasMeter} />
                )}
              </div>
            </Card>

            <Card icon={FileText} iconColor="#0891b2" iconBg="rgba(8,145,178,0.15)" title="Additional Meter Details" delay="rt-d3">
              <div className="rt-grid2">
                {(form.utilityType === 'electricity' || form.utilityType === 'both') && (
                  <>
                    <div>
                      <Field label="MSN (Meter Serial No)">
                        <input className="rt-input" placeholder="e.g. 12A3456789" value={form.msn} onChange={(e) => setField('msn', e.target.value)} />
                      </Field>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card icon={Calendar} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.15)" title="Schedule as Call Back" delay="rt-d5"
              headerRight={
                <div className="rt-toggle-row">
                  <span className="rt-toggle-label">Enable</span>
                  <Switch checked={form.scheduleAsCallback} onCheckedChange={(v) => setField('scheduleAsCallback', v)} />
                </div>
              }
            >
              {form.scheduleAsCallback ? (
                <div className="rt-grid2">
                  <div>
                    <Field label="Date" icon={Calendar}>
                      <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} className="rt-input" style={{ paddingLeft: '38px' }} />
                    </Field>
                  </div>
                  <div>
                    <Field label="Time" icon={Clock}>
                      <input type="time" value={form.time || '10:00'} onChange={(e) => setField('time', e.target.value)} className="rt-input" style={{ paddingLeft: '38px' }} />
                    </Field>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0, fontStyle: 'italic' }}>
                  Enable to schedule a callback for this transfer.
                </p>
              )}
            </Card>

            <Card icon={FileText} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title="Notes" delay="rt-d6">
              <Field label="Notes">
                <textarea className="rt-textarea" rows={4} placeholder="Any additional notes about this transfer..." value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
              </Field>
            </Card>

            <div className="rt-actions">
              <button type="submit" className="rt-btn-primary" disabled={saving}>
                {saving
                  ? <><Loader2 size={16} className="rt-spin" /> Saving…</>
                  : <><Save size={16} /> Save Changes</>
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}
