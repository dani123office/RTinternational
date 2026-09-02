import { useState, useEffect, useRef } from 'react'
import api, { endpoints } from '@/lib/api'

export function useDuplicateCheck(postcode, phone, businessName) {
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const cleanPostcode = postcode ? postcode.trim() : ''
    const cleanPhone = phone ? phone.trim() : ''

    if ((!cleanPostcode || cleanPostcode.length < 4) && (!cleanPhone || cleanPhone.length < 7)) {
      setDuplicateWarning(null)
      setIsChecking(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    setIsChecking(true)
    timerRef.current = setTimeout(async () => {
      try {
        const params = {}
        if (cleanPostcode && cleanPostcode.length >= 4) params.postcode = cleanPostcode
        if (cleanPhone && cleanPhone.length >= 7) params.phone = cleanPhone
        if (businessName && businessName.trim()) params.business_name = businessName.trim()

        const res = await api.get(endpoints.customerCheckDuplicate, { params })
        if (res.data?.isDuplicate) {
          setDuplicateWarning(res.data)
        } else if (res.data?.reassignable) {
          setDuplicateWarning({
            ...res.data,
            isInfo: true,
          })
        } else {
          setDuplicateWarning(null)
        }
      } catch {
        // Silently ignore network errors during typing check
      } finally {
        setIsChecking(false)
      }
    }, 450)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [postcode, phone, businessName])

  const clearWarning = () => setDuplicateWarning(null)

  return { duplicateWarning, isChecking, clearWarning }
}
