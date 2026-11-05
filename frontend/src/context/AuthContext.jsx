import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, signOut as apiSignOut } from '../services/authApi.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = getCurrentUser()
    setUser(u)
    setLoading(false)
  }, [])

  function login(userData) {
    setUser(userData)
  }

  async function logout(redirectTo = '/') {
    // 1. Hapus token & sesi pengguna dari localStorage seketika (sinkron)
    localStorage.removeItem('suaralens_token')
    localStorage.removeItem('suaralens_user')
    setUser(null)

    // 2. Beri tahu backend tanpa memblokir redirect
    try {
      await apiSignOut()
    } catch {
      // abaikan error jaringan saat logout
    }

    // 3. Arahkan pengguna ke landing page (atau rute tujuan) secara bersih
    if (window.location.pathname === redirectTo) {
      window.location.reload()
    } else {
      window.location.href = redirectTo
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
