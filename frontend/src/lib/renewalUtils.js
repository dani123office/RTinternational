/**
 * Utility functions for calculating Renewal Callbacks (customers whose contract end date has 1 month or less remaining)
 */

export function extractRenewalItems({ customers = [], callbacks = [], transfers = [], sales = [] } = {}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const customerMap = new Map()

  const processCustomer = (cust, sourceRecord = null, sourceType = 'customer') => {
    if (!cust || !cust.id) return

    const elecMeters = cust.electricityMeters || []
    const gasMeters = cust.gasMeters || []

    const allMeters = [
      ...elecMeters.map((m) => ({ ...m, type: 'electricity' })),
      ...gasMeters.map((m) => ({ ...m, type: 'gas' })),
    ]

    for (const m of allMeters) {
      if (!m.contractEndDate) continue
      const endDate = new Date(m.contractEndDate)
      if (isNaN(endDate.getTime())) continue
      endDate.setHours(0, 0, 0, 0)

      const diffTime = endDate - today
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // Renewal window: contract end date has 30 days or less remaining
      if (daysRemaining <= 30) {
        const key = `${cust.id}-${m.type}-${m.id || m.supplyNumber || m.mprn || m.meterSerial || Math.random()}`
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            key,
            customerId: cust.id,
            customer: cust,
            businessName: cust.businessName || 'Unnamed Business',
            ownerName: cust.ownerName || 'N/A',
            businessPhone: cust.businessPhone || cust.ownerPhone || 'N/A',
            email: cust.email || 'N/A',
            postcode: cust.postcode || 'N/A',
            businessAddress: cust.businessAddress || 'N/A',
            meterType: m.type,
            supplier: m.currentSupplier || 'N/A',
            mpanOrMprn: m.supplyNumber || m.mprn || 'N/A',
            meterSerial: m.meterSerial || 'N/A',
            accountNumber: m.accountNumber || 'N/A',
            contractEndDate: m.contractEndDate,
            formattedEndDate: endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            daysRemaining,
            isExpired: daysRemaining < 0,
            isUrgent: daysRemaining >= 0 && daysRemaining <= 15,
            sourceType,
            sourceRecord,
          })
        }
      }
    }
  }

  if (Array.isArray(customers)) customers.forEach((c) => processCustomer(c, c, 'customer'))
  if (Array.isArray(callbacks)) callbacks.forEach((cb) => processCustomer(cb.customer, cb, 'callback'))
  if (Array.isArray(transfers)) transfers.forEach((t) => processCustomer(t.customer, t, 'transfer'))
  if (Array.isArray(sales)) sales.forEach((s) => processCustomer(s.customer, s, 'sale'))

  return Array.from(customerMap.values()).sort((a, b) => a.daysRemaining - b.daysRemaining)
}
