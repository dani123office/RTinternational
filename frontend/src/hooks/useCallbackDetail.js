import { useMemo, useState, useEffect } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useToast } from '@/components/ui/toastContext'
import api from '@/lib/api'

/**
 * Custom hook managing business rules and data queries for Callback Details page
 */
export function useCallbackDetail(id, navigate) {
  const callbackId = Number(id)
  const { toast } = useToast()

  const {
    callbacks,
    transfers,
    sales,
    updateCallback,
    updateTransfer,
    deleteCallback,
    isLoading,
  } = useDataStore()

  const [converting, setConverting] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('10:00')
  const [showNotInterested, setShowNotInterested] = useState(false)
  const [notInterestedReason, setNotInterestedReason] = useState('')
  const [directCallback, setDirectCallback] = useState(null)
  const [directLinkedTransfer, setDirectLinkedTransfer] = useState(null)
  const [fetchingDirect, setFetchingDirect] = useState(false)
  const [fetchingDirectTransfer, setFetchingDirectTransfer] = useState(false)

  // Try store first, fallback to direct API fetch (for manager role)
  const callback = useMemo(() => {
    return callbacks.find((c) => c.id === callbackId) || directCallback
  }, [callbacks, callbackId, directCallback])

  // Direct fetch if not in store (manager viewing / store not loaded)
  useEffect(() => {
    const loadCallback = async () => {
      const found = callbacks.find((c) => c.id === callbackId)
      if (!found && !directCallback && !fetchingDirect) {
        setFetchingDirect(true)
        try {
          const res = await api.get(`/api/callbacks/${callbackId}`)
          setDirectCallback(res.data)
        } catch {
          toast('Failed to load callback details', 'error')
        } finally {
          setFetchingDirect(false)
        }
      }
    }
    loadCallback()
  }, [callbackId, callbacks, directCallback, fetchingDirect, toast])

  // Extract nested customer profile safely
  const customer = useMemo(() => callback?.customer || {}, [callback])

  const loading = (isLoading || fetchingDirect) && !callback

  // Look up related functional pipeline logs
  const linkedTransfers = useMemo(() => {
    if (directLinkedTransfer) return [directLinkedTransfer]
    const exactTransfer = callback?.transferId ? transfers.find((t) => t.id === callback.transferId) : null
    if (exactTransfer) return [exactTransfer]

    const byCallBackId = transfers.filter((t) => t.callBackId === callbackId)
    if (byCallBackId.length > 0) return byCallBackId

    const byCustomer = transfers.filter((t) => t.customerId === callback?.customerId)
    if (byCustomer.length > 0) return byCustomer

    return []
  }, [transfers, callbackId, callback?.customerId, callback?.transferId, directLinkedTransfer])

  // If callback has a linked transfer ID and the store doesn't have it yet, fetch it directly
  useEffect(() => {
    const fetchLinkedTransfer = async () => {
      if (!callback?.transferId || directLinkedTransfer || fetchingDirectTransfer) return
      const existsInStore = transfers.find((t) => t.id === callback.transferId)
      if (existsInStore) return
      setFetchingDirectTransfer(true)
      try {
        const res = await api.get(`/api/transfers/${callback.transferId}`)
        setDirectLinkedTransfer(res.data)
      } catch {
        // silent fail; linkedTransfers will remain empty
      } finally {
        setFetchingDirectTransfer(false)
      }
    }

    fetchLinkedTransfer()
  }, [callback?.transferId, transfers, directLinkedTransfer, fetchingDirectTransfer])

  const linkedSales = useMemo(() => {
    const transferIds = linkedTransfers.map((t) => t.id)
    return sales.filter((s) => transferIds.includes(s.transferId))
  }, [sales, linkedTransfers])

  /**
   * Action Handler: Delete current callback standard tracking record
   */
  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this callback?")
    if (!confirmed) return

    try {
      await deleteCallback(callbackId)
      toast('Callback deleted successfully', 'success')
      navigate('/callbacks')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || err.message || 'Failed to delete callback. Please try again.'
      toast(msg, 'error')
    }
  }

  /**
   * Action Handler: Update reschedule timeline values
   */
  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast('Please select a valid date', 'error')
      return
    }

    try {
      const scheduledDateTime = `${rescheduleDate}T${rescheduleTime}:00`
      await updateCallback(callbackId, {
        scheduledDateTime,
        status: 'pending',
        outcome: null,
      })

      toast('Callback rescheduled successfully', 'success')
      setShowReschedule(false)
    } catch {
      toast('Failed to reschedule callback', 'error')
    }
  }

  /**
   * Action Handler: Open not-interested dialog for reason
   */
  const handleNotInterested = () => {
    setShowNotInterested(true)
  }

  /**
   * Action Handler: Confirm not-interested with reason
   */
  const handleConfirmNotInterested = async () => {
    if (!notInterestedReason.trim()) {
      toast('Please provide a reason', 'error')
      return
    }

    try {
      await updateCallback(callbackId, {
        status: 'not_interested',
        outcome: 'not_interested',
        notInterestedReason: notInterestedReason.trim(),
      })

      // Also update linked transfer if exists
      if (callback.transferId) {
        await updateTransfer(callback.transferId, {
          status: 'not_interested',
          outcome: 'not_interested',
          notInterestedReason: notInterestedReason.trim(),
        })
      } else {
        const linkedTransfer = linkedTransfers[0]
        if (linkedTransfer) {
          await updateTransfer(linkedTransfer.id, {
            status: 'not_interested',
            outcome: 'not_interested',
            notInterestedReason: notInterestedReason.trim(),
          })
        }
      }

      toast('Marked as not interested', 'success')
      setShowNotInterested(false)
      setNotInterestedReason('')
    } catch {
      toast('Failed to update callback status', 'error')
    }
  }

  /**
   * Action Handler: Mark callback completed and transfer data forward to a new layout
   */
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
    linkedTransfers,
    linkedSales,
    loading,
    converting,
    showReschedule,
    setShowReschedule,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTime,
    setRescheduleTime,
    showNotInterested,
    setShowNotInterested,
    notInterestedReason,
    setNotInterestedReason,
    handleDelete,
    handleReschedule,
    handleNotInterested,
    handleConfirmNotInterested,
    handleMarkAsTransfer,
  }
}
