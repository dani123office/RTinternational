import { create } from 'zustand'
import api, { endpoints } from '@/lib/api'

const storage = {
  get(key) {
    const val = localStorage.getItem(key)
    if (val) return val
    return sessionStorage.getItem(key)
  },
  set(key, val, remember) {
    if (remember) {
      localStorage.setItem(key, val)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, val)
      localStorage.removeItem(key)
    }
  },
  remove(key) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const useAuthStore = create((set, get) => ({
  emailForVerification: null,
  token: storage.get('token') || null,
  user: (() => {
    try { return JSON.parse(storage.get('user')) } catch { return null }
  })(),
  rememberMe: localStorage.getItem('rememberMe') === 'true',
  isLoading: false,
  error: null,

  login: async (email, password, rememberMe = true) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.post(endpoints.auth.login, { email, password })
      const { token, refreshToken, userId, name, role, managerId } = res.data
      const user = { id: userId, name, email, role, managerId }
      storage.set('token', token, rememberMe)
      storage.set('refreshToken', refreshToken, rememberMe)
      storage.set('user', JSON.stringify(user), rememberMe)
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false')
      set({ token, user, rememberMe, isLoading: false })
      return true
    } catch (err) {
      const isNetwork = !err.response || err.code === 'ERR_NETWORK'
      const msg = isNetwork
        ? 'Connection error. Please check your internet and try again.'
        : (err.response?.data?.detail || err.response?.data?.message || 'Login failed')
      set({ error: msg, isLoading: false })
      return false
    }
  },

  register: async (name, email, password, role = 'agent', rememberMe = true,
    fatherName, cnic, phone, dateOfBirth, emergContactName, emergContactNumber) => {
    set({ isLoading: true, error: null })
    try {
      await api.post(endpoints.auth.register, {
        name, email, password, role,
        fatherName, cnic, phone, dateOfBirth, emergContactName, emergContactNumber,
      })
      set({ isLoading: false })
      return true
    } catch (err) {
      const isNetwork = !err.response || err.code === 'ERR_NETWORK'
      const msg = isNetwork
        ? 'Connection error. Please check your internet and try again.'
        : (err.response?.data?.detail || err.response?.data?.message || 'Registration failed')
      set({ error: msg, isLoading: false })
      return false
    }
  },

  setEmailForVerification: (email) => set({ emailForVerification: email }),

  sendOtp: async (email) => {
    try {
      const res = await api.post(endpoints.auth.sendOtp, { email })
      return { ok: true, sent: res.data?.sent === true }
    } catch {
      return { ok: false, sent: false }
    }
  },

  verifyOtp: async (email, otp) => {
    try {
      const res = await api.post(endpoints.auth.verifyOtp, { email, otp })
      return res.data?.verified === true
    } catch {
      return false
    }
  },

  logout: () => {
    storage.remove('token')
    storage.remove('refreshToken')
    storage.remove('user')
    localStorage.removeItem('rememberMe')
    set({ token: null, user: null, rememberMe: false })
  },

  getCurrentUserId: () => {
    const { user } = get()
    return user?.id || null
  },
}))
