import { useCallback } from 'react'
import { useToast } from '@/components/ui/toastContext'

export function useLoadingToast() {
  const { toast } = useToast()

  const execute = useCallback(async (action, messages = {}) => {
    const { loading, success = 'Success', error: errorMsg = 'Operation failed' } = messages
    try {
      if (loading) toast(loading, 'info')
      const result = await action()
      if (success) toast(success, 'success')
      return result
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || errorMsg
      toast(msg, 'error')
      return null
    }
  }, [toast])

  return execute
}
