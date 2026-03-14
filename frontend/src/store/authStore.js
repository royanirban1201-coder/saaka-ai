import { create } from 'zustand'
import { authAPI } from '../services/api'

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('sakaa_token') || null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    localStorage.setItem('sakaa_token', token)
    set({ token })
  },
  clearAuth: () => {
    localStorage.removeItem('sakaa_token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    try {
      const res = await authAPI.me()
      set({ user: res.data })
      return res.data
    } catch {
      get().clearAuth()
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.login({ email, password })
      localStorage.setItem('sakaa_token', res.data.token)
      set({ token: res.data.token, user: res.data.user, loading: false })
      return res.data
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Login failed', loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('sakaa_token')
    set({ user: null, token: null })
    window.location.href = '/'
  },

  isEmployer: () => get().user?.role === 'employer',
  isFreelancer: () => get().user?.role === 'freelancer',
  isAdmin: () => get().user?.role === 'admin',
}))

export default useAuthStore
