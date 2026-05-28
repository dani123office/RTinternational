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
  const { sales, transfers, callbacks, updateSale, deleteSale, loadSales, loadTransfers, loadCallbacks } = store
  
  const [showDelete, setShowDelete] = useState(false)
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

  const handleStatusChange = async (newStatus) => {
    try {
      await updateSale(saleId, { cotStatus: newStatus })
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

    handleStatusChange,
    handleDelete,
    loading: store.isLoading || loadingDetail,
    error: store.error,
  }
}
