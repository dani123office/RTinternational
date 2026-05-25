import { create } from 'zustand'
import api, { endpoints } from '@/lib/api'

export const useAdminStore = create((set, get) => ({
  managers: [],
  agents: [],
  users: [],
  overallStats: null,
  performanceOverview: null,
  businessFeed: [],
  isLoading: false,
  error: null,

  loadManagers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.admin.managers)
      set({ managers: res.data, isLoading: false })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load managers', isLoading: false })
    }
  },

  loadAgents: async (showAll = false) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.admin.agents, { params: { showAll } })
      set({ agents: res.data, isLoading: false })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load agents', isLoading: false })
    }
  },

  loadUsers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.admin.users)
      set({ users: res.data, isLoading: false })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load users', isLoading: false })
    }
  },

  loadOverallStats: async () => {
    try {
      const res = await api.get(endpoints.admin.overallStats)
      set({ overallStats: res.data })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load overall stats' })
    }
  },

  loadPerformanceOverview: async () => {
    try {
      const res = await api.get(endpoints.admin.performanceOverview)
      set({ performanceOverview: res.data })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load performance data' })
    }
  },

  loadBusinessFeed: async () => {
    try {
      const res = await api.get(endpoints.admin.businessFeed)
      set({ businessFeed: res.data })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load business feed' })
    }
  },

  createManager: async (data) => {
    const res = await api.post(endpoints.admin.createManager, data)
    await get().loadManagers()
    return res.data
  },

  createAgent: async (data) => {
    const res = await api.post(endpoints.admin.createAgent, data)
    await get().loadAgents()
    return res.data
  },

  updateUser: async (id, data, showAll = false) => {
    const res = await api.put(endpoints.admin.updateUser(id), data)
    await get().loadManagers()
    await get().loadAgents(showAll)
    return res.data
  },

  deleteUser: async (id, showAll = false) => {
    const res = await api.delete(endpoints.admin.deleteUser(id))
    await get().loadManagers()
    await get().loadAgents(showAll)
    return res.data
  },

  assignAgent: async (agentId, managerId, showAll = false) => {
    const res = await api.patch(endpoints.admin.assignAgent, { agentId, managerId })
    await get().loadAgents(showAll)
    return res.data
  },
}))
