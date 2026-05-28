import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import { useToast } from '@/components/ui/toastContext'

export function useCustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { customers, deleteCustomer } = useDataStore()
  
  const [showDelete, setShowDelete] = useState(false)
  
  const customerId = Number(id)
  
  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId])

  const handleDelete = async () => {
    try {
      await deleteCustomer(customerId)
      toast('Customer deleted', 'success')
      navigate('/customers')
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || err.message || 'Failed to delete customer'
      toast(msg, 'error')
    }
  }

  return {
    customer,
    showDelete,
    setShowDelete,
    handleDelete,
  }
}
