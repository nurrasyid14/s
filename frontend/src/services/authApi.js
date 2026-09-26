import api from './api.js'

// =============================================
// MOCK DATA (digunakan sebelum backend siap)
// =============================================
const MOCK_USER = {
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@student.pens.ac.id',
  nim_nip: '7654321',
  role: 'user',
  user_role: 'Mahasiswa',
  institution: 'PENS',
  created_at: '2024-01-10T08:00:00Z',
}

const MOCK_STAKEHOLDER = {
  id: 2,
  name: 'Dr. Sari Wulandari',
  email: 'sari@pens.ac.id',
  role: 'stakeholder',
  position: 'Kepala Bagian Kemahasiswaan',
  institution: 'PENS',
  created_at: '2024-01-05T08:00:00Z',
}

const USE_MOCK = true // toggle ke false saat backend siap

// =============================================
// AUTH API
// =============================================

/**
 * Sign in — returns { token, user }
 */
export async function signIn({ email, password }) {
  if (USE_MOCK) {
    await delay(800)
    const isStakeholder = email.includes('stakeholder') || email === 'sari@pens.ac.id'
    const user = isStakeholder ? MOCK_STAKEHOLDER : MOCK_USER
    const token = 'mock_token_' + Date.now()
    localStorage.setItem('suaralens_token', token)
    localStorage.setItem('suaralens_user', JSON.stringify(user))
    return { token, user }
  }
  const res = await api.post('/auth/login', { email, password })
  const { token, user } = res.data
  localStorage.setItem('suaralens_token', token)
  localStorage.setItem('suaralens_user', JSON.stringify(user))
  return { token, user }
}

/**
 * Sign up user
 */
export async function signUpUser(data) {
  if (USE_MOCK) {
    await delay(1000)
    return { success: true, user: { ...MOCK_USER, ...data } }
  }
  const res = await api.post('/auth/register/user', data)
  return res.data
}

/**
 * Sign up stakeholder
 */
export async function signUpStakeholder(data) {
  if (USE_MOCK) {
    await delay(1000)
    return { success: true, user: { ...MOCK_STAKEHOLDER, ...data } }
  }
  const res = await api.post('/auth/register/stakeholder', data)
  return res.data
}

/**
 * Sign out
 */
export function signOut() {
  localStorage.removeItem('suaralens_token')
  localStorage.removeItem('suaralens_user')
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('suaralens_user') || 'null')
  } catch {
    return null
  }
}

// Helper
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
