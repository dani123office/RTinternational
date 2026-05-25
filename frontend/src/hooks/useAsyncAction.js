import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/toastContext'

export function useAsyncAction(options = {}) {
  const { onSuccess, onError } = options
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const execute = useCallback(async (action, messages = {}) => {
    const { success = 'Success', error: errorMsg = 'Operation failed' } = messages
    setIsLoading(true)
    setError(null)
    try {
      const result = await action()
      if (success) toast(success, 'success')
      onSuccess?.(result)
      return result
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : detail?.message || errorMsg
      setError(msg)
      toast(msg, 'error')
      onError?.(err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [toast, onSuccess, onError])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return { isLoading, error, execute, reset }
}
