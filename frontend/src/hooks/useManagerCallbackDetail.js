import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useManagerStore } from '@/store/managerStore'
import { useToast } from '@/components/ui/toastContext'

export function useManagerCallbackDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    callbacks,
    transfers,
    sales,
    loadCallbacks,
    loadTransfers,
    loadSales,
    updateCallback,
    deleteCallback,
    isLoading,
  } = useManagerStore()

  const callbackId = Number(id)

  const callback = useMemo(
    () => callbacks.find((c) => c.id === callbackId),
    [callbacks, callbackId]
  )

  const customer = useMemo(() => callback?.customer || {}, [callback])

  const [converting, setConverting] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('10:00')
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [showNotInterested, setShowNotInterested] = useState(false)
  const [notInterestedReason, setNotInterestedReason] = useState('')

  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        const promises = []
        if (callbacks.length === 0 || !callbacks.some(c => c.id === callbackId)) {
          promises.push(loadCallbacks())
        }
        if (transfers.length === 0) {
          promises.push(loadTransfers())
        }
        if (sales.length === 0) {
          promises.push(loadSales())
        }
        if (promises.length > 0) {
          await Promise.all(promises)
        }
      } catch (err) {
        console.error("Error loading callback detail data:", err)
      } finally {
        if (active) setLoadingDetail(false)
      }
    }
    loadData()
    return () => { active = false }
  }, [callbackId, callbacks, transfers.length, sales.length, loadCallbacks, loadTransfers, loadSales])

  useEffect(() => {
    const updateReschedule = () => {
      if (callback?.scheduledDateTime) {
        setRescheduleDate(callback.scheduledDateTime.substring(0, 10))
        setRescheduleTime(callback.scheduledDateTime.substring(11, 16))
      }
    }
    updateReschedule()
  }, [callback])

  const handleDelete = async () => {
    if (!callback) return
    try {
      await deleteCallback(callbackId)
      toast('Callback deleted successfully', 'success')
      navigate('/manager/callbacks')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || err.message || 'Failed to delete callback'
      toast(msg, 'error')
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast('Please select a date', 'error')
      return
    }
    try {
      await updateCallback(callbackId, { scheduledDateTime: `${rescheduleDate}T${rescheduleTime}:00` })
      toast('Callback rescheduled successfully', 'success')
      setShowReschedule(false)
    } catch {
      toast('Failed to reschedule callback', 'error')
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
      await updateCallback(callbackId, {
        status: 'not_interested',
        outcome: 'not_interested',
        notInterestedReason: notInterestedReason.trim()
      })

      // Also update linked transfer if exists
      const linkedTransfer = transfers.find((t) => t.callBackId === callbackId)
      if (linkedTransfer) {
        const { updateTransfer } = useManagerStore.getState()
        await updateTransfer(linkedTransfer.id, {
          status: 'not_interested',
          outcome: 'not_interested',
          notInterestedReason: notInterestedReason.trim()
        })
      }

      toast('Marked as not interested', 'success')
      setShowNotInterested(false)
      setNotInterestedReason('')
    } catch {
      toast('Failed to update callback status', 'error')
    }
  }

  const handleMarkAsTransfer = async () => {
    try {
      setConverting(true)
      await updateCallback(callbackId, {
        status: 'done',
        outcome: 'converted',
      })

      const isFromTransfer = Boolean(callback?.transferId)
      if (isFromTransfer) {
        navigate('/sales/apply', {
          state: {
            fromCallback: true,
            transferId: callback.transferId,
            customerId: callback.customerId,
            prefillData: {
              ...customer,
              callbackId,
              transferId: callback.transferId,
              notes: callback?.notes,
              offeredRates: {
                electricity: callback?.offeredElectricityRates,
                gas: callback?.offeredGasRates,
              },
              accountNumber: callback?.accountNumber,
              mpan: callback?.mpan,
              mprn: callback?.mprn,
              msn: callback?.msn,
            },
          },
        })
      } else {
        navigate('/transfers/add', {
          state: {
            fromCallback: true,
            prefillData: {
              ...customer,
              callbackId,
              notes: callback?.notes,
              offeredRates: {
                electricity: callback?.offeredElectricityRates,
                gas: callback?.offeredGasRates,
              },
              accountNumber: callback?.accountNumber,
              mpan: callback?.mpan,
              mprn: callback?.mprn,
              msn: callback?.msn,
            },
          },
        })
      }
    } catch {
      toast('Conversion configuration setup failed', 'error')
    } finally {
      setConverting(false)
    }
  }

  return {
    callback,
    customer,
    linkedTransfers: useMemo(() => {
      const byCallBackId = transfers.filter((t) => t.callBackId === callbackId)
      if (byCallBackId.length > 0) return byCallBackId
      const byTransferId = callback?.transferId ? transfers.filter((t) => t.id === callback.transferId) : []
      if (byTransferId.length > 0) return byTransferId
      return transfers.filter((t) => t.customerId === callback?.customerId)
    }, [transfers, callbackId, callback?.customerId, callback?.transferId]),
    linkedSales: useMemo(() => {
      const transferIds = transfers
        .filter((t) => t.callBackId === callbackId || t.customerId === callback?.customerId)
        .map((t) => t.id)
      return sales.filter((s) => transferIds.includes(s.transferId))
    }, [sales, transfers, callbackId, callback?.customerId]),
    loading: isLoading || loadingDetail,
    showReschedule,
    setShowReschedule,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTime,
    setRescheduleTime,
    handleDelete,
    handleReschedule,
    handleNotInterested,
    handleConfirmNotInterested,
    handleMarkAsTransfer,
    converting,
    showNotInterested,
    setShowNotInterested,
    notInterestedReason,
    setNotInterestedReason,
  }
}
