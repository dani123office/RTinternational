import React from 'react'
import { Phone, PhoneCall } from 'lucide-react'

export const callViaVonage = (phoneNumber) => {
  if (!phoneNumber) return
  const cleaned = String(phoneNumber).replace(/[^0-9+]/g, '')
  if (cleaned) {
    window.location.href = `tel:${cleaned}`
  }
}

export default function CallViaVonageButton({
  phone,
  altPhone,
  label = 'Call via Vonage',
  variant = 'hero',
  size = 'md',
  className = '',
  disabled = false,
}) {
  const targetPhone = phone || altPhone
  const hasPhone = Boolean(targetPhone && String(targetPhone).trim() !== '' && String(targetPhone).trim().toUpperCase() !== 'N/A')

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!hasPhone || disabled) return
    callViaVonage(targetPhone)
  }

  if (variant === 'hero') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!hasPhone || disabled}
        title={hasPhone ? `Call ${targetPhone} via Vonage` : 'No phone number available'}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-sm active:scale-95 select-none ${
          hasPhone && !disabled
            ? 'bg-white text-indigo-700 hover:bg-slate-50 hover:shadow-md border border-white/40'
            : 'bg-white/40 text-white/70 cursor-not-allowed border border-white/20'
        } ${className}`}
      >
        <PhoneCall size={16} className={hasPhone ? 'text-indigo-600 animate-pulse' : ''} />
        <span>{label}</span>
        {hasPhone && (
          <span className="text-xs font-mono opacity-80 font-normal ml-0.5">
            ({targetPhone})
          </span>
        )}
      </button>
    )
  }

  if (variant === 'action') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!hasPhone || disabled}
        title={hasPhone ? `Call ${targetPhone} via Vonage` : 'No phone number available'}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-sm select-none ${
          hasPhone && !disabled
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 border border-indigo-600'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
        } ${className}`}
      >
        <PhoneCall size={16} />
        <span>{label}</span>
      </button>
    )
  }

  if (variant === 'outline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!hasPhone || disabled}
        title={hasPhone ? `Call ${targetPhone} via Vonage` : 'No phone number available'}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shadow-sm select-none ${
          hasPhone && !disabled
            ? 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
            : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200'
        } ${className}`}
      >
        <PhoneCall size={15} />
        <span>{label}</span>
      </button>
    )
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!hasPhone || disabled}
        title={hasPhone ? `Call ${targetPhone} via Vonage` : 'No phone number'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
          hasPhone && !disabled
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 active:bg-indigo-200'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
        } ${className}`}
      >
        <Phone size={12} className={hasPhone ? 'text-indigo-600' : ''} />
        <span>{label || 'Call'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!hasPhone || disabled}
      title={hasPhone ? `Call ${targetPhone} via Vonage` : 'No phone number available'}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
        hasPhone && !disabled
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
      } ${className}`}
    >
      <PhoneCall size={16} />
      <span>{label}</span>
    </button>
  )
}
