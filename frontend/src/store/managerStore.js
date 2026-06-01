import { create } from 'zustand'
import api, { endpoints } from '@/lib/api'

function getError(err) {
  const detail = err.response?.data?.detail
  if (!detail) return 'Request failed'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg || String(d)).join('; ')
  return String(detail)
}

export const useManagerStore = create((set) => ({
  teamStats: null,
  agents: [],
  selectedAgent: null,
  callbacks: [],
  transfers: [],
  sales: [],
  notifications: [],
  isLoading: false,
  error: null,

  loadTeamStats: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.manager.teamStats, { params })
      set({ teamStats: res.data, isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load stats', isLoading: false })
    }
  },

  loadAgents: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.manager.agents)
      set({ agents: res.data, isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load agents', isLoading: false })
    }
  },

  loadAgentDetail: async (id) => {
    set({ selectedAgent: null, isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.manager.agentDetail(id))
      set({ selectedAgent: res.data, isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load agent', isLoading: false })
    }
  },

  loadCallbacks: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.manager.callbacks, { params })
      set({ callbacks: res.data.items || res.data || [], isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load callbacks', isLoading: false })
    }
  },

  loadTransfers: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.manager.transfers, { params })
      set({ transfers: res.data.items || res.data || [], isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load transfers', isLoading: false })
    }
  },

  loadSales: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.manager.sales, { params })
      set({ sales: res.data.items || res.data || [], isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load sales', isLoading: false })
    }
  },

  createCallback: async (data) => {
    const res = await api.post(endpoints.manager.callback, data)
    const cb = res.data
    set((s) => ({ callbacks: [cb, ...s.callbacks] }))
    return cb
  },

  createTransfer: async (data) => {
    const res = await api.post(endpoints.manager.transfer, data)
    const t = res.data
    set((s) => ({ transfers: [t, ...s.transfers] }))
    return t
  },

  createSale: async (data) => {
    const res = await api.post(endpoints.manager.sale, data)
    const s = res.data
    set((state) => ({ sales: [s, ...state.sales] }))
    return s
  },

  updateCallback: async (id, data) => {
    const res = await api.put(endpoints.manager.updateCallback(id), data)
    const updated = res.data
    set((s) => ({
      callbacks: s.callbacks.map((c) => (c.id === id ? updated : c)),
    }))
    return updated
  },

  updateTransfer: async (id, data) => {
    const res = await api.put(endpoints.manager.updateTransfer(id), data)
    const updated = res.data
    set((s) => ({
      transfers: s.transfers.map((t) => (t.id === id ? updated : t)),
    }))
    return updated
  },

  updateSale: async (id, data) => {
    const res = await api.put(endpoints.manager.updateSale(id), data)
    const updated = res.data
    set((state) => ({
      sales: state.sales.map((s) => (s.id === id ? updated : s)),
    }))
    return updated
  },

  deleteCallback: async (id) => {
    await api.delete(endpoints.manager.deleteCallback(id))
    set((s) => ({ callbacks: s.callbacks.filter((c) => c.id !== id) }))
  },

  deleteTransfer: async (id) => {
    await api.delete(endpoints.manager.deleteTransfer(id))
    set((s) => ({ transfers: s.transfers.filter((t) => t.id !== id) }))
  },

  deleteSale: async (id) => {
    await api.delete(endpoints.manager.deleteSale(id))
    set((state) => ({ sales: state.sales.filter((s) => s.id !== id) }))
  },

  loadNotifications: async (params = {}) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.manager.notifications, { params })
      set({ notifications: res.data, isLoading: false })
    } catch (err) {
      set({ error: getError(err) || 'Failed to load notifications', isLoading: false })
    }
  },
}))
