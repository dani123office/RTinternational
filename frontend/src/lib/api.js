import axios from 'axios'

let redirecting = false

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !redirecting) {
      redirecting = true
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      window.location.href = '/login'
    }
    
    if (error.response?.data?.detail && typeof error.response.data.detail === 'object') {
      const d = error.response.data.detail
      if (Array.isArray(d)) {
        error.response.data.detail = d.map(x => x.msg).join(', ')
      } else if (d.message) {
        error.response.data.detail = d.message
      } else {
        error.response.data.detail = JSON.stringify(d)
      }
    }

    if (!error.response) {
      window.dispatchEvent(new CustomEvent('api:connection-error', { detail: error.message }))
    }
    return Promise.reject(error)
  }
)

export const endpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
  callbacks: '/api/callbacks',
  transfers: '/api/transfers',
  sales: '/api/sales',
  customers: '/api/customers',
  ai: { extract: '/api/ai/extract' },
  manager: {
    teamStats: '/api/manager/team-stats',
    agents: '/api/manager/agents',
    agentDetail: (id) => `/api/manager/agent/${id}`,
    callbacks: '/api/manager/callbacks',
    transfers: '/api/manager/transfers',
    sales: '/api/manager/sales',
    callback: '/api/manager/callback',
    transfer: '/api/manager/transfer',
    sale: '/api/manager/sale',
    updateCallback: (id) => `/api/manager/callbacks/${id}`,
    updateTransfer: (id) => `/api/manager/transfers/${id}`,
    updateSale: (id) => `/api/manager/sales/${id}`,
    deleteCallback: (id) => `/api/manager/callbacks/${id}`,
    deleteTransfer: (id) => `/api/manager/transfers/${id}`,
    deleteSale: (id) => `/api/manager/sales/${id}`,
    notifications: '/api/manager/notifications',
  },
  attendance: {
    today: '/api/attendance/today',
    checkIn: '/api/attendance/check-in',
    checkOut: '/api/attendance/check-out',
    myHistory: '/api/attendance/my-history',
    stats: '/api/attendance/stats',
    teamToday: '/api/attendance/team-today',
    agentHistory: (id) => `/api/attendance/agent-history/${id}`,
  },
  leaves: {
    create: '/api/leaves',
    my: '/api/leaves/my',
    pending: '/api/leaves/pending',
    review: (id) => `/api/leaves/${id}/review`,
    agent: (id) => `/api/leaves/agent/${id}`,
  },
  salary: {
    slip: '/api/salary/slip',
    adminSlip: (userId) => `/api/admin/salary/slip/${userId}`,
  },
  admin: {
    users: '/api/admin/users',
    managers: '/api/admin/managers',
    managerDetail: (id) => `/api/admin/managers/${id}`,
    agents: '/api/admin/agents',
    agentDetail: (id) => `/api/admin/agents/${id}`,
    updateAgentStaff: (id) => `/api/admin/agents/${id}`,
    createManager: '/api/admin/create-manager',
    createAgent: '/api/admin/create-agent',
    updateUser: (id) => `/api/admin/user/${id}`,
    deleteUser: (id) => `/api/admin/user/${id}`,
    assignAgent: '/api/admin/assign-agent',
    pendingUsers: '/api/admin/pending-users',
    approveUser: (id) => `/api/admin/approve-user/${id}`,
    resetUserPassword: (id) => `/api/admin/reset-user-password/${id}`,
    callbacks: '/api/admin/callbacks',
    callbackDetail: (id) => `/api/admin/callbacks/${id}`,
    transfers: '/api/admin/transfers',
    sales: '/api/admin/sales',
    overallStats: '/api/admin/overall-stats',
    performanceOverview: '/api/admin/performance-overview',
    businessFeed: '/api/admin/business-feed',
    saleDetail: (id) => `/api/admin/sales/${id}`,
  },
}

export const extractData = (res) => {
  if (Array.isArray(res.data)) return res.data
  if (res.data?.items) return res.data.items
  if (res.data?.data) return res.data.data
  return res.data
}

export default api
