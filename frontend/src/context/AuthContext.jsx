import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, signOut as apiSignOut } from '../services/authApi.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = getCurrentUser()
    setUser(u)
    setLoading(false)
  }, [])

  function login(userData) { setUser(userData) }

  function logout() {
    apiSignOut()
    setUser(null)
    window.location.href = '/'
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
