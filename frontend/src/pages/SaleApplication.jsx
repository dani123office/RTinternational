import { APP_STYLES } from '@/lib/styles'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import api from '@/lib/api'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { useManagerStore } from '@/store/managerStore'
import { useToast } from '@/components/ui/toastContext'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import UtilityTypeSelector from '@/components/UtilityTypeSelector'
import ElectricityMeterSection from '@/components/ElectricityMeterSection'
import GasMeterSection from '@/components/GasMeterSection'
import CommissionRateCard from '@/components/CommissionRateCard'
import NonCommissionRateCard from '@/components/NonCommissionRateCard'
import AiFormFiller from '@/components/AiFormFiller'
import { DEFAULT_ELEC_METER, DEFAULT_GAS_METER, BUSINESS_TYPES, BILL_FREQUENCIES, PAYMENT_METHODS } from '@/lib/constants'
import {
  ArrowLeft, Save, Loader2, User, CreditCard, FileText,
  Building2, Zap, ChevronRight, Calendar as CalendarIcon, Clock, Mail, Phone, MapPin
} from 'lucide-react'

function Card({ icon: Icon, iconColor, iconBg, title, headerRight, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay || ''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon" style={{ background: iconBg || 'rgba(99,102,241,0.15)' }}>
            <Icon size={16} color={iconColor || '#6366f1'} />
          </div>
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
      <div className="rt-input-icon-wrap">
        {Icon && (
          <div className="rt-input-icon">
            <Icon size={15} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function SupplierField({ value, onChange, label }) {
  return (
    <div className="rt-span2" style={{ marginBottom: '4px' }}>
      <label className="rt-label">{label}</label>
      <input className="rt-input" value={value} onChange={onChange} placeholder="e.g. British Gas" />
    </div>
  )
}

const toNum = (v) => (v === '' || v == null ? null : Number.isNaN(Number(v)) ? null : Number(v))
const normDate = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0] }

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

export default function SaleApplication() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const saleId = Number(id)
  const { toast } = useToast()
  const { createCustomer, updateCustomer, createTransfer, updateTransfer, createSale, updateSale, loadSales } = useDataStore()
  const { getCurrentUserId, user } = useAuthStore()
  const isManager = user?.role === 'manager'
  const managerStore = useManagerStore()
  
  const state = location.state || {}
  const prefill = state.prefillData || state || {}
  const customer = prefill.customer || {}

  const [loadingEditData, setLoadingEditData] = useState(isEdit)
  const [editIds, setEditIds] = useState({ customerId: null, transferId: null })

  useEffect(() => {
    if (!isEdit) return
    const fetchSaleDetails = async () => {
      try {
        const res = await api.get(`/api/sales/${saleId}`)
        const s = res.data
        
        let lt = null
        if (s.transferId) {
          const resT = await api.get(`/api/transfers/${s.transferId}`)
          lt = resT.data
        }
        
        const cust = s.customer || {}
        const eRates = lt?.offeredElectricityRates || []
        const gRates = lt?.offeredGasRates || []
        const hasRates = (eRates.length > 0) || (gRates.length > 0)

        setForm({
          businessName: cust.businessName || '',
          businessPhone: cust.businessPhone || '',
          businessAddress: cust.businessAddress || '',
          postcode: cust.postcode || '',
          ownerName: cust.ownerName || '',
          ownerPhone: cust.ownerPhone || '',
          email: cust.email || '',
          utilityType: cust.utilityType || 'electricity',
          elecMeters: (cust.electricityMeters && cust.electricityMeters.length)
            ? cust.electricityMeters.map((m, i) => ({
                meterNumber: m.meterNumber || i + 1,
                currentSupplier: m.currentSupplier || '', supplyNumber: m.supplyNumber || '',
                dayUnitRate: m.dayUnitRate?.toString() || '', nightUnitRate: m.nightUnitRate?.toString() || '',
                eveningUnitRate: m.eveningUnitRate?.toString() || '', standingRate: m.standingRate?.toString() || '',
                monthlyBill: m.monthlyBill?.toString() || '', contractEndDate: normDate(m.contractEndDate) || '',
              }))
            : [{ ...DEFAULT_ELEC_METER }],
          gasMeters: (cust.gasMeters && cust.gasMeters.length)
            ? cust.gasMeters.map((m, i) => ({
                meterNumber: m.meterNumber || i + 1,
                currentSupplier: m.currentSupplier || '', unitRate: m.unitRate?.toString() || '',
                standingRate: m.standingRate?.toString() || '', monthlyBill: m.monthlyBill?.toString() || '',
                contractEndDate: normDate(m.contractEndDate) || '',
              }))
            : [{ ...DEFAULT_GAS_METER }],
          mpan: lt?.mpan || '',
          mprn: lt?.mprn || '',
          msn: lt?.msn || '',
          accountNumber: lt?.accountNumber || '',
          date: lt?.scheduledDateTime?.substring(0, 10) || '',
          time: lt?.scheduledDateTime?.substring(11, 16) || '',
          transferNotes: lt?.notes || '',
          showOfferRates: hasRates,
          elecSupplier: eRates[0]?.supplier || '',
          elecContractLength: eRates[0]?.contractLength || '1 Year',
          elecMeterType: eRates[0]?.meterType || 'Standard',
          elecCommissionType: eRates[0]?.commissionType || 'Commission',
          elecCommission: {
            dayUnitRate: eRates[0]?.dayUnitRate?.toString() || '',
            nightUnitRate: eRates[0]?.nightUnitRate?.toString() || '',
            eveningUnitRate: eRates[0]?.eveningUnitRate?.toString() || '',
            standingRate: eRates[0]?.standingRate?.toString() || '',
          },
          elecNonCommission: {
            dayUnitRate: (eRates[0]?.nonCommissionDayRate || eRates[0]?.nonCommissionDayUnitRate)?.toString() || '',
            nightUnitRate: eRates[0]?.nonCommissionNightRate?.toString() || '',
            eveningUnitRate: eRates[0]?.nonCommissionEveningRate?.toString() || '',
            standingRate: eRates[0]?.nonCommissionStandingRate?.toString() || '',
            brokerServiceCharge: eRates[0]?.brokerServiceCharge?.toString() || '',
          },
          gasSupplier: gRates[0]?.supplier || '',
          gasContractLength: gRates[0]?.contractLength || '1 Year',
          gasCommissionType: gRates[0]?.commissionType || 'Commission',
          gasCommission: {
            dayUnitRate: (gRates[0]?.unitRate || gRates[0]?.dayUnitRate)?.toString() || '',
            standingRate: gRates[0]?.standingRate?.toString() || '',
          },
          gasNonCommission: {
            dayUnitRate: (gRates[0]?.nonCommissionUnitRate || gRates[0]?.nonCommissionDayRate || gRates[0]?.nonCommissionDayUnitRate)?.toString() || '',
            standingRate: gRates[0]?.nonCommissionStandingRate?.toString() || '',
            brokerServiceCharge: gRates[0]?.brokerServiceCharge?.toString() || '',
          },
          ownerFullName: s.ownerFullName || '',
          homeAddress: s.homeAddress || '',
          dateOfBirth: s.dateOfBirth ? s.dateOfBirth.substring(0, 10) : '',
          businessType: s.businessType || 'soleTrader',
          billFrequency: s.billFrequency || 'monthly',
          paymentMethod: s.paymentMethod || 'bankTransfer',
          bankName: s.bankName || '',
          accountType: s.accountType || '',
          accountTitle: s.accountTitle || '',
          sortCode: s.sortCode || '',
          bankAccountNumber: s.bankAccountNumber || '',
          notes: s.notes || '',
        })
        
        setEditIds({
          customerId: s.customerId,
          transferId: s.transferId
        })
      } catch (err) {
        console.error(err)
        toast('Failed to load sale details for editing', 'error')
      } finally {
        setLoadingEditData(false)
      }
    }
    fetchSaleDetails()
  }, [isEdit, saleId, toast])

  const [form, setForm] = useState(() => {
    const eRates = prefill.offeredElectricityRates || prefill.offeredRates?.electricity || []
    const gRates = prefill.offeredGasRates || prefill.offeredRates?.gas || []
    const hasRates = (eRates.length > 0) || (gRates.length > 0)

    const initialForm = {
      // Customer / Business details
      businessName: customer.businessName || prefill.businessName || '',
      businessPhone: customer.businessPhone || prefill.businessPhone || '',
      businessAddress: customer.businessAddress || prefill.businessAddress || '',
      postcode: customer.postcode || prefill.postcode || '',
      ownerName: customer.ownerName || prefill.ownerName || '',
      ownerPhone: customer.ownerPhone || prefill.ownerPhone || '',
      email: customer.email || prefill.email || '',
      utilityType: prefill.utilityType || customer.utilityType || 'electricity',
      
      // Meters
      elecMeters: (prefill.elecMeters || customer.electricityMeters || prefill.electricityMeters)
        ? (prefill.elecMeters || customer.electricityMeters || prefill.electricityMeters).map((m, i) => ({
            meterNumber: m.meterNumber || i + 1,
            currentSupplier: m.currentSupplier || '', supplyNumber: m.supplyNumber || '',
            dayUnitRate: m.dayUnitRate?.toString() || '', nightUnitRate: m.nightUnitRate?.toString() || '',
            eveningUnitRate: m.eveningUnitRate?.toString() || '', standingRate: m.standingRate?.toString() || '',
            monthlyBill: m.monthlyBill?.toString() || '', contractEndDate: normDate(m.contractEndDate) || '',
          }))
        : [{ ...DEFAULT_ELEC_METER }],
      gasMeters: (prefill.gasMeters || customer.gasMeters)
        ? (prefill.gasMeters || customer.gasMeters).map((m, i) => ({
            meterNumber: m.meterNumber || i + 1,
            currentSupplier: m.currentSupplier || '', unitRate: m.unitRate?.toString() || '',
            standingRate: m.standingRate?.toString() || '', monthlyBill: m.monthlyBill?.toString() || '',
            contractEndDate: normDate(m.contractEndDate) || '',
          }))
        : [{ ...DEFAULT_GAS_METER }],
      
      // Additional meter details
      mpan: prefill.mpan || '',
      mprn: prefill.mprn || '',
      msn: prefill.msn || '',
      accountNumber: prefill.accountNumber || '',
      
      // Schedule/Transfer Date & Time
      date: prefill.scheduledDateTime?.substring(0, 10) || '',
      time: prefill.scheduledDateTime?.substring(11, 16) || '',
      transferNotes: prefill.notes || '',

      // Offered rates details
      showOfferRates: hasRates,
      elecSupplier: eRates[0]?.supplier || '',
      elecContractLength: eRates[0]?.contractLength || '1 Year',
      elecMeterType: eRates[0]?.meterType || 'Standard',
      elecCommissionType: eRates[0]?.commissionType || 'Commission',
      elecCommission: {
        dayUnitRate: eRates[0]?.dayUnitRate?.toString() || '',
        nightUnitRate: eRates[0]?.nightUnitRate?.toString() || '',
        eveningUnitRate: eRates[0]?.eveningUnitRate?.toString() || '',
        standingRate: eRates[0]?.standingRate?.toString() || '',
      },
      elecNonCommission: {
        dayUnitRate: (eRates[0]?.nonCommissionDayRate || eRates[0]?.nonCommissionDayUnitRate)?.toString() || '',
        nightUnitRate: eRates[0]?.nonCommissionNightRate?.toString() || '',
        eveningUnitRate: eRates[0]?.nonCommissionEveningRate?.toString() || '',
        standingRate: eRates[0]?.nonCommissionStandingRate?.toString() || '',
        brokerServiceCharge: eRates[0]?.brokerServiceCharge?.toString() || '',
      },
      gasSupplier: gRates[0]?.supplier || '',
      gasContractLength: gRates[0]?.contractLength || '1 Year',
      gasCommissionType: gRates[0]?.commissionType || 'Commission',
      gasCommission: {
        dayUnitRate: (gRates[0]?.unitRate || gRates[0]?.dayUnitRate)?.toString() || '',
        standingRate: gRates[0]?.standingRate?.toString() || '',
      },
      gasNonCommission: {
        dayUnitRate: (gRates[0]?.nonCommissionUnitRate || gRates[0]?.nonCommissionDayRate || gRates[0]?.nonCommissionDayUnitRate)?.toString() || '',
        standingRate: gRates[0]?.nonCommissionStandingRate?.toString() || '',
        brokerServiceCharge: gRates[0]?.brokerServiceCharge?.toString() || '',
      },

      // Sales specific details
      ownerFullName: customer.ownerName || prefill.ownerName || customer.businessName || prefill.businessName || '',
      homeAddress: customer.businessAddress || prefill.businessAddress || '',
      dateOfBirth: '',
      businessType: 'soleTrader',
      billFrequency: 'monthly',
      paymentMethod: 'bankTransfer',
      bankName: '',
      accountType: '',
      accountTitle: '',
      sortCode: '',
      bankAccountNumber: '',
      notes: '', // sales notes
    }
    return initialForm
  })

  const [loading, setLoading] = useState(false)

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }))
  const upd = (field, value) => setForm((p) => ({ ...p, [field]: value }))

  const handleAiFill = (data) => {
    setForm((p) => {
      const next = { ...p }
      if (data.businessName)    next.businessName    = data.businessName
      if (data.businessAddress) next.businessAddress = data.businessAddress
      if (data.businessPhone)   next.businessPhone   = data.businessPhone
      if (data.ownerPhone)      next.ownerPhone      = data.ownerPhone
      if (data.postcode)        next.postcode        = data.postcode
      if (data.ownerName)       next.ownerName       = data.ownerName
      if (data.email)           next.email           = data.email
      if (data.utilityType)     next.utilityType     = data.utilityType
      
      if (data.ownerName && !next.ownerFullName) next.ownerFullName = data.ownerName
      if (data.businessAddress && !next.homeAddress) next.homeAddress = data.businessAddress

      if (data.electricityMeters?.length) {
        next.elecMeters = data.electricityMeters.map((m, i) => ({
          meterNumber: m.meterNumber || i + 1,
          currentSupplier: m.currentSupplier || '', supplyNumber: m.supplyNumber || '',
          dayUnitRate: m.dayUnitRate?.toString() || '', nightUnitRate: m.nightUnitRate?.toString() || '',
          eveningUnitRate: m.eveningUnitRate?.toString() || '', standingRate: m.standingRate?.toString() || '',
          monthlyBill: m.monthlyBill?.toString() || '', contractEndDate: normDate(m.contractEndDate) || '',
        }))
        const first = data.electricityMeters[0]
        if (first.mpan && !next.mpan) next.mpan = first.mpan
        if (!next.mpan && first.supplyNumber) next.mpan = first.supplyNumber
        if (first.msn && !next.msn) next.msn = first.msn
        if (first.accountNumber && !next.accountNumber) next.accountNumber = first.accountNumber
      }

      if (data.gasMeters?.length) {
        next.gasMeters = data.gasMeters.map((m, i) => ({
          meterNumber: m.meterNumber || i + 1,
          currentSupplier: m.currentSupplier || '',
          unitRate: (m.unitRate || m.dayUnitRate)?.toString() || '',
          standingRate: m.standingRate?.toString() || '',
          monthlyBill: m.monthlyBill?.toString() || '',
          contractEndDate: normDate(m.contractEndDate) || '',
        }))
        const first = data.gasMeters[0]
        if (first.mprn && !next.mprn) next.mprn = first.mprn
        if (first.msn && !next.msn) next.msn = first.msn
        if (first.accountNumber && !next.accountNumber) next.accountNumber = first.accountNumber
      }

      const oe = data.offeredRates?.electricity
      const og = data.offeredRates?.gas
      if (oe || og) {
        next.showOfferRates = true
      }

      if (oe) {
        if (oe.commission) {
          next.elecCommission = {
            dayUnitRate: oe.commission.dayUnitRate?.toString() || p.elecCommission.dayUnitRate,
            nightUnitRate: oe.commission.nightUnitRate?.toString() || p.elecCommission.nightUnitRate,
            eveningUnitRate: oe.commission.eveningUnitRate?.toString() || p.elecCommission.eveningUnitRate,
            standingRate: oe.commission.standingRate?.toString() || p.elecCommission.standingRate,
          }
        }
        if (oe.nonCommission) {
          next.elecNonCommission = {
            dayUnitRate: oe.nonCommission.dayUnitRate?.toString() || p.elecNonCommission.dayUnitRate,
            nightUnitRate: oe.nonCommission.nightUnitRate?.toString() || p.elecNonCommission.nightUnitRate,
            eveningUnitRate: oe.nonCommission.eveningUnitRate?.toString() || p.elecNonCommission.eveningUnitRate,
            standingRate: oe.nonCommission.standingRate?.toString() || p.elecNonCommission.standingRate,
            brokerServiceCharge: oe.nonCommission.brokerServiceCharge?.toString() || p.elecNonCommission.brokerServiceCharge,
          }
        }
        if (oe.supplier)      next.elecSupplier      = oe.supplier
        if (oe.contractLength) next.elecContractLength = oe.contractLength
        if (oe.meterType)     next.elecMeterType     = oe.meterType
      }

      if (og) {
        if (og.commission) {
          next.gasCommission = {
            dayUnitRate: (og.commission.dayUnitRate || og.commission.unitRate)?.toString() || p.gasCommission.dayUnitRate,
            standingRate: og.commission.standingRate?.toString() || p.gasCommission.standingRate,
          }
        }
        if (og.nonCommission) {
          next.gasNonCommission = {
            dayUnitRate: (og.nonCommission.dayUnitRate || og.nonCommission.unitRate)?.toString() || p.gasNonCommission.dayUnitRate,
            standingRate: og.nonCommission.standingRate?.toString() || p.gasNonCommission.standingRate,
            brokerServiceCharge: og.nonCommission.brokerServiceCharge?.toString() || p.gasNonCommission.brokerServiceCharge,
          }
        }
        if (og.supplier)       next.gasSupplier       = og.supplier
        if (og.contractLength) next.gasContractLength = og.contractLength
      }

      return next
    })
  }

  const addElectricityMeter = () => setForm((p) => ({ ...p, elecMeters: [...p.elecMeters, { ...DEFAULT_ELEC_METER }] }))
  const removeElectricityMeter = (idx) => setForm((p) => ({ ...p, elecMeters: p.elecMeters.filter((_, i) => i !== idx) }))
  const addGasMeter = () => setForm((p) => ({ ...p, gasMeters: [...p.gasMeters, { ...DEFAULT_GAS_METER }] }))
  const removeGasMeter = (idx) => setForm((p) => ({ ...p, gasMeters: p.gasMeters.filter((_, i) => i !== idx) }))

  const validate = () => {
    // Business Details validations
    if (!form.businessName.trim()) { toast('Business name is required', 'error'); return false }
    if (!form.businessPhone.trim()) { toast('Business phone is required', 'error'); return false }
    if (!form.businessAddress.trim()) { toast('Business address is required', 'error'); return false }
    if (!form.postcode.trim()) { toast('Postcode is required', 'error'); return false }

    // Rates validations
    if (form.showOfferRates && form.utilityType !== 'gas') {
      const c = form.elecCommission, nc = form.elecNonCommission
      if (toNum(nc.dayUnitRate) > toNum(c.dayUnitRate)) { toast('Electricity non-commission Day Rate cannot exceed commission Day Rate', 'error'); return false }
      if (toNum(nc.nightUnitRate) > toNum(c.nightUnitRate)) { toast('Electricity non-commission Night Rate cannot exceed commission Night Rate', 'error'); return false }
      if (toNum(nc.eveningUnitRate) > toNum(c.eveningUnitRate)) { toast('Electricity non-commission Evening Rate cannot exceed commission Evening Rate', 'error'); return false }
      if (toNum(nc.standingRate) > toNum(c.standingRate)) { toast('Electricity non-commission Standing Charge cannot exceed commission Standing Charge', 'error'); return false }
    }
    if (form.showOfferRates && form.utilityType !== 'electricity') {
      const c = form.gasCommission, nc = form.gasNonCommission
      if (toNum(nc.dayUnitRate) > toNum(c.dayUnitRate)) { toast('Gas non-commission Unit Rate cannot exceed commission Unit Rate', 'error'); return false }
      if (toNum(nc.standingRate) > toNum(c.standingRate)) { toast('Gas non-commission Standing Charge cannot exceed commission Standing Charge', 'error'); return false }
    }

    // Sales validations
    if (!form.ownerFullName.trim()) { toast('Owner Full Name is required', 'error'); return false }
    if (!form.dateOfBirth) { toast('Date of Birth is required', 'error'); return false }
    if (!form.homeAddress.trim()) { toast('Home Address is required', 'error'); return false }
    if (!form.paymentMethod) { toast('Payment Method is required', 'error'); return false }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const uid = getCurrentUserId()
      if (!uid) throw new Error('Authentication failed')

      // 1. Prepare Customer Payload
      const elecRates = form.utilityType !== 'gas' ? form.elecMeters.map(mapMeter) : []
      const gasRates = form.utilityType !== 'electricity' ? form.gasMeters.map(mapGasMeter) : []
      
      const customerPayload = {
        businessName: form.businessName.trim(),
        businessPhone: form.businessPhone.trim(),
        businessAddress: form.businessAddress.trim(),
        postcode: form.postcode.trim().toUpperCase(),
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim(),
        email: form.email.trim(),
        utilityType: form.utilityType,
        electricityRates: elecRates,
        gasRates,
      }

      let finalCustomerId = editIds.customerId || state.customerId || prefill.id || null
      if (finalCustomerId) {
        await updateCustomer(finalCustomerId, customerPayload)
      } else {
        const newCustomer = await createCustomer({ ...customerPayload, employeeId: uid })
        finalCustomerId = newCustomer.id
      }

      // 2. Prepare Transfer Payload
      const transferPayload = {
        utilityType: form.utilityType,
        accountNumber: form.accountNumber || null,
        notes: form.transferNotes || null,
        mpan: form.utilityType !== 'gas' ? form.mpan || null : null,
        mprn: form.utilityType !== 'electricity' ? form.mprn || null : null,
        msn: form.msn || null,
        scheduledDateTime: form.date ? `${form.date}T${form.time || '10:00'}:00` : null,
        offeredElectricityRates: form.showOfferRates && form.utilityType !== 'gas' ? [{
          contractLength: form.elecContractLength,
          supplier: form.elecSupplier || null,
          meterType: form.elecMeterType,
          commissionType: form.elecCommissionType,
          dayUnitRate: form.elecCommissionType === 'Commission' ? toNum(form.elecCommission.dayUnitRate) : null,
          nightUnitRate: form.elecCommissionType === 'Commission' ? toNum(form.elecCommission.nightUnitRate) : null,
          eveningUnitRate: form.elecCommissionType === 'Commission' ? toNum(form.elecCommission.eveningUnitRate) : null,
          standingRate: form.elecCommissionType === 'Commission' ? toNum(form.elecCommission.standingRate) : null,
          nonCommissionDayRate: form.elecCommissionType === 'Non-Commission' ? toNum(form.elecNonCommission.dayUnitRate) : null,
          nonCommissionNightRate: form.elecCommissionType === 'Non-Commission' ? toNum(form.elecNonCommission.nightUnitRate) : null,
          nonCommissionEveningRate: form.elecCommissionType === 'Non-Commission' ? toNum(form.elecNonCommission.eveningUnitRate) : null,
          nonCommissionStandingRate: form.elecCommissionType === 'Non-Commission' ? toNum(form.elecNonCommission.standingRate) : null,
          brokerServiceCharge: toNum(form.elecNonCommission.brokerServiceCharge),
        }] : [],
        offeredGasRates: form.showOfferRates && form.utilityType !== 'electricity' ? [{
          contractLength: form.gasContractLength,
          supplier: form.gasSupplier || null,
          commissionType: form.gasCommissionType,
          unitRate: form.gasCommissionType === 'Commission' ? toNum(form.gasCommission.dayUnitRate) : null,
          standingRate: form.gasCommissionType === 'Commission' ? toNum(form.gasCommission.standingRate) : null,
          nonCommissionUnitRate: form.gasCommissionType === 'Non-Commission' ? toNum(form.gasNonCommission.dayUnitRate) : null,
          nonCommissionStandingRate: form.gasCommissionType === 'Non-Commission' ? toNum(form.gasNonCommission.standingRate) : null,
          brokerServiceCharge: toNum(form.gasNonCommission.brokerServiceCharge),
        }] : [],
      }

      let finalTransferId = editIds.transferId || state.transferId
      if (finalTransferId) {
        await updateTransfer(finalTransferId, transferPayload)
      } else {
        const newTransfer = await createTransfer({
          ...transferPayload,
          customerId: finalCustomerId,
          employeeId: uid,
        })
        finalTransferId = newTransfer.id
      }

      // 3. Submit or Update Sale Application
      const salePayload = {
        ownerFullName: form.ownerFullName.trim(),
        homeAddress: form.homeAddress.trim(),
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString().split('T')[0] : null,
        businessType: form.businessType,
        billFrequency: form.billFrequency,
        paymentMethod: form.paymentMethod,
        bankName: form.bankName || null,
        accountType: form.accountType || null,
        accountTitle: form.accountTitle || null,
        sortCode: form.sortCode || null,
        bankAccountNumber: form.bankAccountNumber || null,
        notes: form.notes || null,
      }

      if (isEdit) {
        if (isManager) {
          await managerStore.updateSale(saleId, salePayload)
          await managerStore.loadSales()
          toast('Sale updated successfully', 'success')
          navigate(`/sales/${saleId}`)
        } else {
          await updateSale(saleId, salePayload)
          await loadSales()
          toast('Sale updated successfully', 'success')
          navigate(`/sales/${saleId}`)
        }
      } else {
        if (isManager) {
          const targetAgentId = prefill.employeeId || customer.employeeId || state.employeeId || null
          if (!targetAgentId) {
            throw new Error('Could not determine agent for this sale')
          }
          await managerStore.createSale({
            employeeId: targetAgentId,
            customerId: finalCustomerId,
            transferId: finalTransferId,
            ...salePayload,
          })
          await managerStore.loadSales()
          toast('Sale application submitted successfully', 'success')
          navigate('/manager/sales')
        } else {
          await createSale({
            employeeId: uid,
            customerId: finalCustomerId,
            transferId: finalTransferId,
            ...salePayload,
          })
          await loadSales()
          toast('Sale application submitted successfully', 'success')
          navigate('/sales')
        }
      }
    } catch (err) {
      const d = err.response?.data?.detail
      toast(typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg).join('; ') : d?.message || err.message || 'Error submitting sale', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loadingEditData) {
    return (
      <>
        <style>{APP_STYLES}</style>
        <div className="rt-page">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="rt-card" style={{ padding: '40px' }}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 rt-spin text-indigo-500" />
                <p className="text-sm text-gray-500 font-medium">Loading sale details...</p>
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
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button className="rt-back-btn" type="button" onClick={() => navigate(isEdit ? `/sales/${saleId}` : (isManager ? '/manager/sales' : '/sales'))}>
                <ArrowLeft size={17} />
              </button>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
                  {isEdit ? 'Edit Sale Application' : 'Sale Application'}
                </h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0', fontFamily: "'DM Sans',sans-serif" }}>
                  {isEdit ? 'Update the customer, transfer, and sale information' : 'Complete the customer, transfer, and sale information'}
                </p>
              </div>
            </div>
            <AiFormFiller onFill={handleAiFill} />
          </div>

          <form onSubmit={handleSubmit} className="rt-section-gap">
            
            {/* 1. Business Information Card */}
            <Card icon={Building2} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title="Business Details" delay="rt-d1">
              <div className="rt-grid2">
                <div className="rt-span2">
                  <Field label="Business Name" required icon={Building2}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} placeholder="e.g. Acme Corp Ltd" value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Business Address" required icon={MapPin}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} placeholder="e.g. 123 High Street, London, EC1A 1BB" value={form.businessAddress} onChange={(e) => setField('businessAddress', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Postcode" required>
                    <input className="rt-input" placeholder="e.g. SW1A 1AA" value={form.postcode} onChange={(e) => setField('postcode', e.target.value.toUpperCase())} />
                  </Field>
                </div>
                <div>
                  <Field label="Business Phone" icon={Phone}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} placeholder="e.g. 01234 567890" value={form.businessPhone} onChange={(e) => setField('businessPhone', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Email Address" icon={Mail}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} type="email" placeholder="e.g. info@acme.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Decision Maker / Owner" icon={User}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} placeholder="e.g. John Smith" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Owner Direct Phone" icon={Phone}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} placeholder="e.g. 07712 345678" value={form.ownerPhone} onChange={(e) => setField('ownerPhone', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Transfer Call Notes" icon={FileText}>
                    <textarea className="rt-textarea" style={{ minHeight: '80px' }} placeholder="Any additional notes about the transfer/callback..." value={form.transferNotes} onChange={(e) => setField('transferNotes', e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>

            {/* 2. Meter Details Card */}
            <Card icon={Zap} iconColor="#22c55e" iconBg="rgba(34,197,94,0.15)" title="Utility Infrastructure Profiles" delay="rt-d2">
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

            {/* 3. Additional Meter Details Card */}
            <Card icon={FileText} iconColor="#0891b2" iconBg="rgba(8,145,178,0.15)" title="Additional Meter Details" delay="rt-d3">
              <div className="rt-grid2">
                {(form.utilityType === 'electricity' || form.utilityType === 'both') && (
                  <>
                    <div>
                      <Field label="MPAN (Supply Number)">
                        <input className="rt-input" placeholder="e.g. 04 1234 5678 901" value={form.mpan} onChange={(e) => setField('mpan', e.target.value)} />
                      </Field>
                    </div>
                    <div>
                      <Field label="MSN (Meter Serial No)">
                        <input className="rt-input" placeholder="e.g. 12A3456789" value={form.msn} onChange={(e) => setField('msn', e.target.value)} />
                      </Field>
                    </div>
                  </>
                )}
                {(form.utilityType === 'gas' || form.utilityType === 'both') && (
                  <div>
                    <Field label="MPRN">
                      <input className="rt-input" placeholder="e.g. 1234567890" value={form.mprn} onChange={(e) => setField('mprn', e.target.value)} />
                    </Field>
                  </div>
                )}
                <div>
                  <Field label="Account Number">
                    <input className="rt-input" placeholder="e.g. AC12345678" value={form.accountNumber} onChange={(e) => setField('accountNumber', e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>

            {/* 4. Schedule Card */}
            <Card icon={CalendarIcon} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.15)" title="Schedule Transfer/Callback" delay="rt-d4">
              <div className="rt-grid2">
                <div>
                  <Field label="Date" icon={CalendarIcon}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Time" icon={Clock}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} type="time" value={form.time} onChange={(e) => setField('time', e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>

            {/* 5. Offered Rates Card */}
            <Card
              icon={ChevronRight}
              iconColor="#a78bfa"
              iconBg="rgba(167,139,250,0.15)"
              title="Offer Rates"
              delay="rt-d4"
              headerRight={
                <div className="rt-toggle-row">
                  <span className="rt-toggle-label">Enable</span>
                  <Switch checked={form.showOfferRates} onCheckedChange={(v) => setField('showOfferRates', v)} />
                </div>
              }
            >
              {form.showOfferRates ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(form.utilityType === 'electricity' || form.utilityType === 'both') && (
                    <>
                      <SupplierField label="Offered Supplier (Electricity)" value={form.elecSupplier} onChange={(e) => setField('elecSupplier', e.target.value)} />
                      <div className="rt-grid2">
                        <div>
                          <label className="rt-label">Contract Length</label>
                          <select className="rt-input" value={form.elecContractLength} onChange={(e) => setField('elecContractLength', e.target.value)}>
                            <option value="1 Year">1 Year</option>
                            <option value="2 Years">2 Years</option>
                            <option value="3 Years">3 Years</option>
                            <option value="4 Years">4 Years</option>
                            <option value="5 Years">5 Years</option>
                          </select>
                        </div>
                        <div>
                          <label className="rt-label">Meter Type</label>
                          <select className="rt-input" value={form.elecMeterType} onChange={(e) => setField('elecMeterType', e.target.value)}>
                            <option value="Standard">Standard</option>
                            <option value="Day/Night">Day/Night</option>
                            <option value="Half Hourly">Half Hourly</option>
                          </select>
                        </div>
                      </div>
                      <div className="rt-grid2">
                        <div>
                          <label className="rt-label">Commission Type</label>
                          <select className="rt-input" value={form.elecCommissionType} onChange={(e) => setField('elecCommissionType', e.target.value)}>
                            <option value="Commission">Commission</option>
                            <option value="Non-Commission">Non-Commission</option>
                          </select>
                        </div>
                      </div>
                      {form.elecCommissionType === 'Commission' ? (
                        <CommissionRateCard title="Electricity Commission Rates" rates={form.elecCommission} onUpdate={(v) => setField('elecCommission', v)} type="electricity" />
                      ) : (
                        <NonCommissionRateCard title="Electricity Non-Commission Rates" rates={form.elecNonCommission} onUpdate={(v) => setField('elecNonCommission', v)} type="electricity" />
                      )}
                    </>
                  )}
                  {(form.utilityType === 'gas' || form.utilityType === 'both') && (
                    <>
                      <SupplierField label="Offered Supplier (Gas)" value={form.gasSupplier} onChange={(e) => setField('gasSupplier', e.target.value)} />
                      <div className="rt-grid2">
                        <div>
                          <label className="rt-label">Contract Length</label>
                          <select className="rt-input" value={form.gasContractLength} onChange={(e) => setField('gasContractLength', e.target.value)}>
                            <option value="1 Year">1 Year</option>
                            <option value="2 Years">2 Years</option>
                            <option value="3 Years">3 Years</option>
                            <option value="4 Years">4 Years</option>
                            <option value="5 Years">5 Years</option>
                          </select>
                        </div>
                        <div>
                          <label className="rt-label">Commission Type</label>
                          <select className="rt-input" value={form.gasCommissionType} onChange={(e) => setField('gasCommissionType', e.target.value)}>
                            <option value="Commission">Commission</option>
                            <option value="Non-Commission">Non-Commission</option>
                          </select>
                        </div>
                      </div>
                      {form.gasCommissionType === 'Commission' ? (
                        <CommissionRateCard title="Gas Commission Rates" rates={form.gasCommission} onUpdate={(v) => setField('gasCommission', v)} type="gas" />
                      ) : (
                        <NonCommissionRateCard title="Gas Non-Commission Rates" rates={form.gasNonCommission} onUpdate={(v) => setField('gasNonCommission', v)} type="gas" />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0, fontStyle: 'italic' }}>
                  Enable to add commission and non-commission rates for this transfer.
                </p>
              )}
            </Card>

            <div className="rt-divider" style={{ margin: '20px 0' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Sales Details</h2>

            {/* 6. Personal Details Card */}
            <Card icon={User} iconColor="#22c55e" iconBg="rgba(34,197,94,0.15)" title="Personal Details" delay="rt-d5">
              <div className="rt-grid2">
                <div>
                  <Field label="Owner Full Name" required>
                    <input className="rt-input" value={form.ownerFullName} onChange={(e) => upd('ownerFullName', e.target.value)} required />
                  </Field>
                </div>
                <div>
                  <Field label="Date of Birth" required icon={CalendarIcon}>
                    <input type="date" className="rt-input" style={{ paddingLeft: '38px' }} value={form.dateOfBirth} onChange={(e) => upd('dateOfBirth', e.target.value)} required />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Home Address" required icon={MapPin}>
                    <input className="rt-input" style={{ paddingLeft: '38px' }} value={form.homeAddress} onChange={(e) => upd('homeAddress', e.target.value)} required />
                  </Field>
                </div>
                <div>
                  <Field label="Business Type">
                    <Select value={form.businessType} onChange={(e) => upd('businessType', e.target.value)} className="rt-input">
                      {BUSINESS_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <div>
                  <Field label="Bill Frequency">
                    <Select value={form.billFrequency} onChange={(e) => upd('billFrequency', e.target.value)} className="rt-input">
                      {BILL_FREQUENCIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                </div>
              </div>
            </Card>

            {/* 7. Payment Method Card */}
            <Card icon={CreditCard} iconColor="#f97316" iconBg="rgba(249,115,22,0.15)" title="Payment Method" delay="rt-d6">
              <div className="rt-grid2">
                <div className="rt-span2">
                  <Field label="Payment Method" required>
                    <Select value={form.paymentMethod} onChange={(e) => upd('paymentMethod', e.target.value)} className="rt-input">
                      {PAYMENT_METHODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <div>
                  <Field label="Bank Name">
                    <input className="rt-input" value={form.bankName} onChange={(e) => upd('bankName', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Account Type">
                    <input className="rt-input" value={form.accountType} onChange={(e) => upd('accountType', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Account Title">
                    <input className="rt-input" value={form.accountTitle} onChange={(e) => upd('accountTitle', e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Sort Code">
                    <input className="rt-input" placeholder="e.g. 12-34-56" value={form.sortCode} onChange={(e) => upd('sortCode', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Bank Account Number">
                    <input className="rt-input" placeholder="6-10 digits" value={form.bankAccountNumber} onChange={(e) => upd('bankAccountNumber', e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>

            {/* 8. Notes Card */}
            <Card icon={FileText} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title="Sales Notes" delay="rt-d6">
              <Field label="Notes">
                <textarea className="rt-textarea" rows={3} value={form.notes} onChange={(e) => upd('notes', e.target.value)} placeholder="Add sales notes..." />
              </Field>
            </Card>

            <div className="rt-actions">
              <button type="submit" className="rt-btn-primary" disabled={loading}>
                {loading ? <><Loader2 size={16} className="rt-spin" /> Saving…</> : <><Save size={16} /> {isEdit ? 'Save Changes' : 'Submit Sale Application'}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
