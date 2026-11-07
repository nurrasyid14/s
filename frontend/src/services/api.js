import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim()
const BASE_URL = configuredBaseUrl || '/api'

if (import.meta.env.PROD && !configuredBaseUrl) {
  console.error(
    'SuaraLens backend is not configured. Set VITE_API_URL in Vercel to the public backend URL, including /api.'
  )
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('suaralens_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('suaralens_token')
      localStorage.removeItem('suaralens_user')
      const path = window.location.pathname || ''
      const isAdminOrStakeholder = path.startsWith('/admin') || path.startsWith('/stakeholder')
      window.location.href = isAdminOrStakeholder ? '/admin/signin' : '/signin'
    }
    return Promise.reject(error)
  }
)

export default api
