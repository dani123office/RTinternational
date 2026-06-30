import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import { useManagerStore } from '@/store/managerStore'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toastContext'

export function useSaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  
  const isManager = user?.role === 'manager'
  const dataStore = useDataStore()
  const managerStore = useManagerStore()
  
  const store = isManager ? managerStore : dataStore
  const { sales, transfers, callbacks, updateSale, deleteSale, updateCallback, loadSales, loadTransfers, loadCallbacks } = store
  
  const [showDelete, setShowDelete] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('10:00')
  const [loadingDetail, setLoadingDetail] = useState(true)
  
  const saleId = Number(id)
  
  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        const promises = []
        if (sales.length === 0 || !sales.some(s => s.id === saleId)) {
          promises.push(loadSales())
        }
        if (transfers.length === 0) {
          promises.push(loadTransfers())
        }
        if (callbacks.length === 0) {
          promises.push(loadCallbacks())
        }
        if (promises.length > 0) {
          await Promise.all(promises)
        }
      } catch (err) {
        console.error("Error loading sale detail data:", err)
      } finally {
        if (active) setLoadingDetail(false)
      }
    }
    loadData()
    return () => { active = false }
  }, [saleId, sales, transfers.length, callbacks.length, loadSales, loadTransfers, loadCallbacks])
  
  const sale = useMemo(() => sales.find((s) => s.id === saleId), [sales, saleId])
  
  const linkedTransfer = useMemo(() => {
    if (!sale?.transferId) return null
    return transfers.find((t) => t.id === sale.transferId)
  }, [sale, transfers])
  
  const linkedCallback = useMemo(() => {
    if (!linkedTransfer?.callBackId) return null
    return callbacks.find((c) => c.id === linkedTransfer.callBackId)
  }, [linkedTransfer, callbacks])

  useEffect(() => {
    if (showReschedule && linkedCallback?.scheduledDateTime) {
      setRescheduleDate(linkedCallback.scheduledDateTime.substring(0, 10))
      setRescheduleTime(linkedCallback.scheduledDateTime.substring(11, 16))
    }
  }, [showReschedule, linkedCallback])

  const handleRescheduleCallback = async () => {
    if (!linkedCallback) return
    if (!rescheduleDate) {
      toast('Please select a valid date', 'error')
      return
    }
    try {
      const scheduledDateTime = `${rescheduleDate}T${rescheduleTime}:00`
      await updateCallback(linkedCallback.id, { 
        scheduledDateTime,
        status: 'pending',
        outcome: 'rescheduled'
      })
      toast('Callback rescheduled successfully', 'success')
      setShowReschedule(false)
    } catch {
      toast('Failed to reschedule callback', 'error')
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const payload = { cotStatus: newStatus }
      if (newStatus === 'renewal') {
        payload.saleType = 'renewal'
      } else if (newStatus === 'outOfContract') {
        payload.saleType = 'out_of_contract'
      } else if (['cotInProgress', 'cotComplete', 'chasing'].includes(newStatus)) {
        payload.saleType = 'cot'
      }
      await updateSale(saleId, payload)
      toast('Status updated', 'success')
    } catch {
      toast('Failed to update status', 'error')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteSale(saleId)
      toast('Sale deleted', 'success')
      navigate('/sales')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || err.message || 'Failed to delete sale'
      toast(msg, 'error')
    }
  }

  return {
    sale,
    linkedTransfer,
    linkedCallback,
    
    showDelete,
    setShowDelete,
    showReschedule,
    setShowReschedule,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTime,
    setRescheduleTime,

    handleStatusChange,
    handleDelete,
    handleRescheduleCallback,
    loading: store.isLoading || loadingDetail,
    error: store.error,
  }
}
