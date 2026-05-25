import { create } from 'zustand'
import api, { endpoints, extractData } from '@/lib/api'

function getError(err) {
  const detail = err.response?.data?.detail
  if (!detail) return 'Request failed'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg || String(d)).join('; ')
  return String(detail)
}

export const useDataStore = create((set, get) => ({
  callbacks: [],
  transfers: [],
  sales: [],
  customers: [],
  isLoading: false,
  error: null,

  loadCallbacks: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.callbacks)
      set({ callbacks: extractData(res), isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load callbacks', isLoading: false })
    }
  },

  createCallback: async (data) => {
    const res = await api.post(endpoints.callbacks, data)
    const cb = extractData(res)
    set((s) => ({ callbacks: [cb, ...s.callbacks] }))
    return cb
  },

  updateCallback: async (id, data) => {
    const res = await api.put(`${endpoints.callbacks}/${id}`, data)
    const updated = extractData(res)
    set((s) => ({ callbacks: s.callbacks.map((c) => (c.id === id ? updated : c)) }))
    return updated
  },

  deleteCallback: async (id) => {
    await api.delete(`${endpoints.callbacks}/${id}`)
    set((s) => ({ callbacks: s.callbacks.filter((c) => c.id !== id) }))
  },

  loadTransfers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.transfers)
      set({ transfers: extractData(res), isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load transfers', isLoading: false })
    }
  },

  createTransfer: async (data) => {
    const res = await api.post(endpoints.transfers, data)
    const t = extractData(res)
    set((s) => ({ transfers: [t, ...s.transfers] }))
    return t
  },

  updateTransfer: async (id, data) => {
    const res = await api.put(`${endpoints.transfers}/${id}`, data)
    const updated = extractData(res)
    set((s) => ({ transfers: s.transfers.map((t) => (t.id === id ? updated : t)) }))
    return updated
  },

  deleteTransfer: async (id) => {
    await api.delete(`${endpoints.transfers}/${id}`)
    set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) }))
  },

  loadSales: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.sales)
      set({ sales: extractData(res), isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load sales', isLoading: false })
    }
  },

  createSale: async (data) => {
    const res = await api.post(endpoints.sales, data)
    const s = extractData(res)
    set((state) => ({ sales: [s, ...state.sales] }))
    return s
  },

  updateSale: async (id, data) => {
    const res = await api.put(`${endpoints.sales}/${id}`, data)
    const updated = extractData(res)
    set((state) => ({ sales: state.sales.map((s) => (s.id === id ? updated : s)) }))
    return updated
  },

  deleteSale: async (id) => {
    await api.delete(`${endpoints.sales}/${id}`)
    set((state) => ({ sales: state.sales.filter((s) => s.id !== id) }))
  },

  loadCustomers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.customers)
      set({ customers: extractData(res), isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load customers', isLoading: false })
    }
  },

  createCustomer: async (data) => {
    const res = await api.post(endpoints.customers, data)
    return extractData(res)
  },

  updateCustomer: async (id, data) => {
    const res = await api.put(`${endpoints.customers}/${id}`, data)
    return extractData(res)
  },

  deleteCustomer: async (id) => {
    await api.delete(`${endpoints.customers}/${id}`)
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }))
  },

  loadAll: async () => {
    set({ isLoading: true, error: null })
    const { loadCallbacks, loadTransfers, loadSales, loadCustomers } = get()
    try {
      await Promise.all([loadCallbacks(), loadTransfers(), loadSales(), loadCustomers()])
    } catch {
      // individual loaders handle their own errors
    }
    set({ isLoading: false })
  },
}))
