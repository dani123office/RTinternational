import { create } from 'zustand'
import api, { endpoints } from '@/lib/api'

export const useAdminStore = create((set, get) => ({
  managers: [],
  agents: [],
  users: [],
  deletedUsers: [],
  pendingUsers: [],
  pendingTotalCount: 0,
  pendingUsersCount: 0,
  pendingLeavesCount: 0,
  pendingLoansCount: 0,
  selectedAgent: null,
  selectedManager: null,
  overallStats: null,
  performanceOverview: null,
  businessFeed: [],
  isLoading: false,
  error: null,

  loadPendingCounts: async () => {
    try {
      const [usersRes, leavesRes, loansRes] = await Promise.allSettled([
        api.get(endpoints.admin.pendingUsers),
        api.get(endpoints.leaves.pending),
        api.get(endpoints.loans.pending),
      ])

      const pUsers = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value?.data) ? usersRes.value.data : []
      const pLeaves = leavesRes.status === 'fulfilled' && Array.isArray(leavesRes.value?.data) ? leavesRes.value.data : []
      const pLoans = loansRes.status === 'fulfilled' && Array.isArray(loansRes.value?.data) ? loansRes.value.data : []

      const total = pUsers.length + pLeaves.length + pLoans.length

      set({
        pendingUsers: pUsers,
        pendingUsersCount: pUsers.length,
        pendingLeavesCount: pLeaves.length,
        pendingLoansCount: pLoans.length,
        pendingTotalCount: total,
      })
      return total
    } catch (err) {
      console.error('Failed to load pending counts', err)
      return 0
    }
  },

  loadManagers: async (year = null, month = null) => {
    set({ isLoading: true, error: null })
    try {
      const params = {}
      if (year) params.year = year
      if (month) params.month = month
      const res = await api.get(endpoints.admin.managers, { params })
      set({ managers: res.data, isLoading: false })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load managers', isLoading: false })
    }
  },

  loadAgents: async (showAll = false, year = null, month = null) => {
    set({ isLoading: true, error: null })
    try {
      const params = { showAll }
      if (year) params.year = year
      if (month) params.month = month
      const res = await api.get(endpoints.admin.agents, { params })
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

  loadOverallStats: async (year, month) => {
    try {
      const params = {}
      if (year != null) params.year = year
      if (month != null) params.month = month
      const res = await api.get(endpoints.admin.overallStats, { params })
      set({ overallStats: res.data })
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load overall stats' })
    }
  },

  loadPerformanceOverview: async (year, month) => {
    try {
      const params = {}
      if (year != null) params.year = year
      if (month != null) params.month = month
      const res = await api.get(endpoints.admin.performanceOverview, { params })
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

  loadPendingUsers: async () => {
    try {
      const res = await api.get(endpoints.admin.pendingUsers)
      set({ pendingUsers: res.data })
      return res.data
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load pending users' })
      return []
    }
  },

  loadDeletedUsers: async () => {
    try {
      const res = await api.get(endpoints.admin.deletedUsers)
      set({ deletedUsers: res.data })
      return res.data
    } catch (err) {
      console.error('Failed to load deleted users', err)
      return []
    }
  },

  restoreUser: async (userId) => {
    const res = await api.post(endpoints.admin.restoreUser(userId))
    await get().loadDeletedUsers()
    await get().loadManagers()
    await get().loadAgents(true)
    return res.data
  },

  approveUser: async (userId, managerId, profileData = {}) => {
    const res = await api.post(endpoints.admin.approveUser(userId), { managerId, ...profileData })
    await get().loadPendingUsers()
    await get().loadManagers()
    await get().loadAgents(true)
    return res.data
  },

  resetUserPassword: async (userId, newPassword) => {
    const res = await api.put(endpoints.admin.resetUserPassword(userId), { newPassword })
    return res.data
  },

  loadAdminManagerDetail: async (id, year = null, month = null) => {
    set({ selectedManager: null, isLoading: true, error: null })
    try {
      const params = {}
      if (year) params.year = year
      if (month) params.month = month
      const res = await api.get(endpoints.admin.managerDetail(id), { params })
      set({ selectedManager: res.data, isLoading: false })
      return res.data
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load manager detail', isLoading: false })
      return null
    }
  },

  loadAdminAgentDetail: async (id) => {
    set({ selectedAgent: null, isLoading: true, error: null })
    try {
      const res = await api.get(endpoints.admin.agentDetail(id))
      set({ selectedAgent: res.data, isLoading: false })
      return res.data
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load agent detail', isLoading: false })
      return null
    }
  },
}))
