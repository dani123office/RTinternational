import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import { useToast } from '@/components/ui/toastContext'

export function useTransferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    transfers,
    callbacks,
    sales,
    updateTransfer,
    updateCallback,
    deleteTransfer,
    createCallback,
  } = useDataStore()

  const [showSchedule, setShowSchedule] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showNotInterested, setShowNotInterested] = useState(false)
  const [notInterestedReason, setNotInterestedReason] = useState('')
  const [saving] = useState(false)
  
  const transferId = Number(id)
  const transfer = useMemo(() => transfers.find((t) => t.id === transferId), [transfers, transferId])
  const linkedSales = useMemo(() => sales.filter((s) => s.transferId === transferId), [sales, transferId])
  const linkedCallback = useMemo(() => {
    if (!transfer?.callBackId) return null
    return callbacks.find((c) => c.id === transfer.callBackId)
  }, [transfer, callbacks])

  const handleDelete = async () => {
    try {
      await deleteTransfer(transferId)
      toast('Transfer deleted', 'success')
      navigate('/transfers')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || err.message || 'Failed to delete transfer'
      toast(msg, 'error')
    }
  }

  const handleMarkAsSale = () => {
    if (!transfer) return
    navigate('/sales/apply', { 
      state: { 
        fromTransfer: true, 
        transferId: transfer.id, 
        customerId: transfer.customerId, 
        prefillData: transfer 
      } 
    })
  }

  const handleReschedule = async (date, time) => {
    if (!date) return
    try {
      await updateTransfer(transferId, { scheduledDateTime: `${date}T${time}:00` })
      toast('Transfer rescheduled', 'success')
      setShowReschedule(false)
    } catch {
      toast('Failed to reschedule', 'error')
    }
  }

  const handleScheduleAsCallback = async (date, time) => {
    if (!date || !transfer) return
    try {
      await createCallback({
        customerId: transfer.customerId,
        employeeId: transfer.employeeId || 1,
        scheduledDateTime: `${date}T${time}:00`,
        notes: `Scheduled from Transfer #${transfer.id}`,
        offeredElectricityRates: transfer.offeredElectricityRates,
        offeredGasRates: transfer.offeredGasRates,
      })
      toast('Callback scheduled from transfer', 'success')
      setShowSchedule(false)
    } catch {
      toast('Failed to schedule callback', 'error')
    }
  }

  const handleNotInterested = () => {
    setShowNotInterested(true)
  }

  const handleConfirmNotInterested = async () => {
    if (!notInterestedReason.trim()) {
      toast('Please provide a reason', 'error')
      return
    }

    try {
      await updateTransfer(transferId, {
        status: 'not_interested',
        outcome: 'not_interested',
        notInterestedReason: notInterestedReason.trim(),
      })

      // Also update linked callback if exists
      if (transfer?.callBackId) {
        await updateCallback(transfer.callBackId, {
          status: 'not_interested',
          outcome: 'not_interested',
          notInterestedReason: notInterestedReason.trim(),
        })
      }

      toast('Marked as not interested', 'success')
      setShowNotInterested(false)
      setNotInterestedReason('')
    } catch {
      toast('Failed to update transfer status', 'error')
    }
  }

  return {
    transfer,
    linkedSales,
    linkedCallback,
    
    showSchedule,
    setShowSchedule,
    showReschedule,
    setShowReschedule,
    showDelete,
    setShowDelete,
    showNotInterested,
    setShowNotInterested,
    notInterestedReason,
    setNotInterestedReason,
    saving,

    handleDelete,
    handleMarkAsSale,
    handleReschedule,
    handleScheduleAsCallback,
    handleNotInterested,
    handleConfirmNotInterested,
  }
}
