import { useState, useCallback } from 'react'

export function useEntityForm(defaults = {}) {
  const [form, setForm] = useState(defaults)

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateForm = useCallback((data) => {
    setForm((prev) => ({ ...prev, ...data }))
  }, [])

  const reset = useCallback((newDefaults) => {
    setForm(newDefaults || defaults)
  }, [defaults])

  return { form, setField, updateForm, reset, setForm }
}
