import { useState, useCallback } from 'react'

export function useConfirmDialog() {
  const [state, setState] = useState({ open: false, data: null })

  const confirm = useCallback((data = null) => {
    return new Promise((resolve) => {
      setState({ open: true, data, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState({ open: false, data: null })
  }, [state])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState({ open: false, data: null })
  }, [state])

  return {
    open: state.open,
    data: state.data,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
