export const formatRate = (value, unit = 'p/kWh') => {
  if (value === null || value === undefined || value === '') return 'N/A'
  const parsed = parseFloat(value)
  if (Number.isNaN(parsed)) return 'N/A'
  return `${parsed.toFixed(2)} ${unit}`
}

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A'
  const parsed = parseFloat(value)
  if (Number.isNaN(parsed)) return 'N/A'
  return `£${parsed.toFixed(2)}`
}

export const formatDate = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatTime = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid Time'
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export const formatDateTime = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

export const normalizeDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().split('T')[0]
}

export const formatPaymentMethod = (value) => {
  if (!value) return 'N/A'
  const clean = value.replace(/rans/i, 'trans')
  const spaced = clean.replace(/([A-Z])/g, ' $1').trim()
  return spaced.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
