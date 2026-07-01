import { useState, useCallback } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toastContext'
import { DEFAULT_TRANSFER_FORM, DEFAULT_ELEC_METER, DEFAULT_GAS_METER } from '@/lib/constants'

const toNum = (v) => (v === '' || v == null ? null : Number.isNaN(Number(v)) ? null : Number(v))
const normDate = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0] }
const normalizeContractEnd = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0]
  const m = String(v).match(/(\w+)\s+(\d{4})/)
  if (m) {
    const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}
    const mon = months[m[1].toLowerCase().slice(0, 3)]
    if (mon) return `${m[2]}-${mon}-01`
  }
  return v
}

const mapMeter = (m, i) => ({
  meterNumber: i + 1, currentSupplier: m.currentSupplier || null, supplyNumber: m.supplyNumber || null,
  dayUnitRate: toNum(m.dayUnitRate), nightUnitRate: toNum(m.nightUnitRate),
  eveningUnitRate: toNum(m.eveningUnitRate), standingRate: toNum(m.standingRate),
  monthlyBill: toNum(m.monthlyBill), contractEndDate: normDate(m.contractEndDate),
})

const mapGasMeter = (m, i) => ({
  meterNumber: i + 1, currentSupplier: m.currentSupplier || null, unitRate: toNum(m.unitRate),
  standingRate: toNum(m.standingRate), monthlyBill: toNum(m.monthlyBill), contractEndDate: normDate(m.contractEndDate),
})

export function useTransferForm(locationState, navigate) {
  const { createTransfer, loadTransfers, createCustomer, createCallback } = useDataStore()
  const { getCurrentUserId } = useAuthStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const existingCustomerId = locationState?.prefillData?.id || null
  const [form, setForm] = useState(() => {
    const prefill = locationState?.prefillData || locationState || {}

    // Handle businessAddress coming in two formats:
    //  1) straight string from customer (businessAddress)
    //  2) split fields from callback form (addressLine1 + city)
    const rawAddress = prefill.businessAddress || prefill.customer?.businessAddress
    const reconstructedAddress = prefill.addressLine1
      ? [prefill.addressLine1, prefill.city].filter(Boolean).join(', ')
      : null
    const resolvedAddress = rawAddress || reconstructedAddress || ''

    const initialForm = {
      ...DEFAULT_TRANSFER_FORM,
      ...prefill,
      businessName: prefill.businessName || prefill.customer?.businessName || '',
      businessPhone: prefill.businessPhone || prefill.customer?.businessPhone || '',
      businessAddress: resolvedAddress,
      postcode: prefill.postcode || prefill.customer?.postcode || '',
      ownerName: prefill.ownerName || prefill.customer?.ownerName || '',
      ownerPhone: prefill.ownerPhone || prefill.customer?.ownerPhone || '',
      email: prefill.email || prefill.customer?.email || '',
      utilityType: prefill.utilityType || prefill.customer?.utilityType || 'electricity',
      // Preserve account/meter details from prefill (callback may supply these)
      accountNumber: prefill.accountNumber || prefill.customer?.accountNumber || '',
      mpan: prefill.mpan || prefill.customer?.mpan || '',
      mprn: prefill.mprn || prefill.customer?.mprn || '',
      msn: prefill.msn || prefill.customer?.msn || '',
      callbackId: prefill.callbackId || prefill.callBackId || null,
      elecMeters: (prefill.elecMeters || prefill.electricityMeters || prefill.customer?.electricityMeters)
        ? (prefill.elecMeters || prefill.electricityMeters || prefill.customer.electricityMeters).map((m, i) => ({
            meterNumber: m.meterNumber || i + 1,
            currentSupplier: m.currentSupplier || '', supplyNumber: m.supplyNumber || '',
            dayUnitRate: m.dayUnitRate?.toString() || '', nightUnitRate: m.nightUnitRate?.toString() || '',
            eveningUnitRate: m.eveningUnitRate?.toString() || '', standingRate: m.standingRate?.toString() || '',
            monthlyBill: m.monthlyBill?.toString() || '', contractEndDate: normDate(m.contractEndDate) || '',
          }))
        : [{ ...DEFAULT_ELEC_METER }],
      gasMeters: (prefill.gasMeters || prefill.customer?.gasMeters)
        ? (prefill.gasMeters || prefill.customer.gasMeters).map((m, i) => ({
            meterNumber: m.meterNumber || i + 1,
            currentSupplier: m.currentSupplier || '', mprn: m.mprn || '', unitRate: m.unitRate?.toString() || '',
            standingRate: m.standingRate?.toString() || '', monthlyBill: m.monthlyBill?.toString() || '',
            contractEndDate: normDate(m.contractEndDate) || '',
          }))
        : [{ ...DEFAULT_GAS_METER }],
    }

    return initialForm
  })


  const setField = useCallback((field, value) => setForm((p) => ({ ...p, [field]: value })), [])

  const handleAiFill = useCallback((data) => {
    setForm((p) => {
      const next = { ...p }

      if (data.businessName)    next.businessName    = data.businessName
      if (data.businessAddress) next.businessAddress = data.businessAddress
      if (data.businessPhone)   next.businessPhone   = data.businessPhone
      if (data.ownerPhone)      next.ownerPhone      = data.ownerPhone
      if (data.postcode)        next.postcode        = data.postcode
      if (data.ownerName)       next.ownerName       = data.ownerName
      if (data.email)           next.email           = data.email
      if (data.notes)           next.notes           = p.notes ? `${p.notes}\n${data.notes}` : data.notes
      if (data.utilityType)     next.utilityType     = data.utilityType
      if (data.accountNumber)   next.accountNumber   = data.accountNumber

      if (data.electricityMeters?.length) {
        next.elecMeters = data.electricityMeters.map((m, i) => ({
          meterNumber: m.meterNumber || i + 1,
          currentSupplier: m.currentSupplier || '', supplyNumber: m.supplyNumber || '',
          dayUnitRate: m.dayUnitRate?.toString() || '', nightUnitRate: m.nightUnitRate?.toString() || '',
          eveningUnitRate: m.eveningUnitRate?.toString() || '', standingRate: m.standingRate?.toString() || '',
          monthlyBill: m.monthlyBill?.toString() || '', contractEndDate: normalizeContractEnd(m.contractEndDate) || '',
        }))
        const first = data.electricityMeters[0]
        if (first.mpan && !next.mpan) next.mpan = first.mpan
        if (!next.mpan && first.supplyNumber) next.mpan = first.supplyNumber
        if (first.msn && !next.msn) next.msn = first.msn
      }

      if (data.gasMeters?.length) {
        next.gasMeters = data.gasMeters.map((m, i) => ({
          meterNumber: m.meterNumber || i + 1,
          currentSupplier: m.currentSupplier || '', mprn: m.mprn || '',
          unitRate: (m.unitRate || m.dayUnitRate)?.toString() || '',
          standingRate: m.standingRate?.toString() || '',
          monthlyBill: m.monthlyBill?.toString() || '',
          contractEndDate: normalizeContractEnd(m.contractEndDate) || '',
        }))
        const first = data.gasMeters[0]
        if (first.mprn && !next.mprn) next.mprn = first.mprn
        if (first.msn && !next.msn) next.msn = first.msn
      }

      return next
    })
  }, [])

  const addElectricityMeter = useCallback(() => setForm((p) => ({ ...p, elecMeters: [...p.elecMeters, { ...DEFAULT_ELEC_METER }] })), [])
  const removeElectricityMeter = useCallback((idx) => setForm((p) => ({ ...p, elecMeters: p.elecMeters.filter((_, i) => i !== idx) })), [])
  const addGasMeter = useCallback(() => setForm((p) => ({ ...p, gasMeters: [...p.gasMeters, { ...DEFAULT_GAS_METER }] })), [])
  const removeGasMeter = useCallback((idx) => setForm((p) => ({ ...p, gasMeters: p.gasMeters.filter((_, i) => i !== idx) })), [])

  const validate = () => {
    if (!form.businessName.trim()) { toast('Business name is required', 'error'); return false }
    if (!form.businessPhone.trim()) { toast('Business phone is required', 'error'); return false }
    if (!form.businessAddress.trim()) { toast('Business address is required', 'error'); return false }
    if (!form.postcode.trim()) { toast('Postcode is required', 'error'); return false }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      const uid = getCurrentUserId()
      if (!uid) throw new Error('Authentication failed')
      const elecRates = form.utilityType !== 'gas' ? form.elecMeters.map(mapMeter) : []
      const gasRates = form.utilityType !== 'electricity' ? form.gasMeters.map(mapGasMeter) : []

      let customerId
      if (existingCustomerId) {
        customerId = existingCustomerId
      } else {
        const customerData = {
          businessName: form.businessName.trim(), businessPhone: form.businessPhone.trim(),
          businessAddress: form.businessAddress.trim(), postcode: form.postcode.trim().toUpperCase(),
          ownerName: form.ownerName.trim(), ownerPhone: form.ownerPhone.trim(), email: form.email.trim(),
          utilityType: form.utilityType, electricityRates: elecRates, gasRates, employeeId: uid,
        }
        const customer = await createCustomer(customerData)
        customerId = customer.id
      }

      const firstElectricitySupply = form.utilityType !== 'gas' ? form.elecMeters?.[0]?.supplyNumber || form.mpan : form.mpan
      const firstGasMprn = form.gasMeters?.[0]?.mprn || form.mprn || null
      const transfer = await createTransfer({
        customerId,
        accountNumber: form.accountNumber || null,
        mpan: firstElectricitySupply || null,
        mprn: firstGasMprn,
        msn: form.msn || null,
        notes: form.notes || null,
        employeeId: uid,
        scheduledDateTime: null,
        callBackId: form.callbackId || form.callBackId || null,
      })

      if (form.scheduleAsCallback && form.scheduledDate) {
        const callbackMpan = form.utilityType !== 'gas' ? form.elecMeters?.[0]?.supplyNumber || form.mpan : form.mpan
        await createCallback({
          customerId,
          scheduledDateTime: `${form.scheduledDate}T${form.scheduledTime || '10:00'}:00`,
          notes: form.notes || null,
          mpan: callbackMpan || null,
          mprn: firstGasMprn,
          msn: form.msn || null,
        })
      }

      await loadTransfers()
      toast('Transfer created successfully', 'success')
      navigate('/transfers')
    } catch (err) {
      const d = err?.response?.data?.detail
      toast(typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg).join(', ') : d?.message || err.message || 'Something went wrong', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    form, isLoading, setField, handleAiFill, handleSubmit,
    addElectricityMeter, removeElectricityMeter, addGasMeter, removeGasMeter,
  }
}
