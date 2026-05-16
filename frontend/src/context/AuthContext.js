'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import ApiService, { AUTH_TOKEN_STORAGE_KEY, getToken, setAuthToken } from '@/services/api'

const AuthContext = createContext(null)
const STORAGE_USER_KEY = 'meu-barbeiro-auth-user'
const STORAGE_TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY

const readStoredUser = () => {
  if (typeof window === 'undefined') return null

  try {
    const rawUser = window.localStorage.getItem(STORAGE_USER_KEY)
    if (!rawUser) return null

    const parsedUser = JSON.parse(rawUser)
    return parsedUser && typeof parsedUser === 'object' ? parsedUser : null
  } catch {
    window.localStorage.removeItem(STORAGE_USER_KEY)
    return null
  }
}

const readStoredToken = () => {
  if (typeof window === 'undefined') return ''
  return String(window.localStorage.getItem(STORAGE_TOKEN_KEY) || '').trim()
}

const persistStoredUser = (user) => {
  if (typeof window === 'undefined') return

  if (!user) {
    window.localStorage.removeItem(STORAGE_USER_KEY)
    return
  }

  window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
}

const persistStoredToken = (token) => {
  setAuthToken(token)
}

export function getRedirectByUserType(user) {
  return user?.tipo === 'barbeiro' ? '/barbearia' : '/perfil'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const syncUser = (nextUser) => {
    persistStoredUser(nextUser)
    setUser(nextUser)
    return nextUser
  }

  useEffect(() => {
    const token = readStoredToken()
    const storedUser = readStoredUser()

    if (!token || !storedUser) {
      persistStoredUser(null)
      persistStoredToken('')
      setUser(null)
      setLoading(false)
      return
    }

    setUser(storedUser)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (loading || !user?.id) return

    let cancelled = false

    ApiService.getMe()
      .then((response) => {
        if (cancelled || !response?.usuario) return

        setUser((currentUser) => {
          const mergedUser = { ...(currentUser || {}), ...response.usuario }
          persistStoredUser(mergedUser)
          return mergedUser
        })
      })
      .catch(() => {
        if (cancelled) return
        persistStoredUser(null)
        persistStoredToken('')
        setUser(null)
      })

    return () => {
      cancelled = true
    }
  }, [loading, user?.id])

  useEffect(() => {
    if (loading || typeof window === 'undefined') return

    persistStoredUser(user)
  }, [user, loading])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = (event) => {
      if (event.key !== STORAGE_USER_KEY) return
      setUser(readStoredUser())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const login = async (email, senha) => {
    const response = await ApiService.login(email, senha)
    
    if (response.usuario && response.token) {
      persistStoredToken(response.token)
      syncUser(response.usuario)
      return { success: true, usuario: response.usuario }
    }
    
    throw new Error(response.error || 'Erro ao fazer login')
  }

  const register = async (data) => {
    const response = await ApiService.register(data)
    
    if (response.usuario && response.token) {
      persistStoredToken(response.token)
      syncUser(response.usuario)
      return { success: true, usuario: response.usuario }
    }
    
    throw new Error(response.error || 'Erro ao criar conta')
  }

  const logout = () => {
    persistStoredUser(null)
    persistStoredToken('')
    setUser(null)
  }

  const updateUser = (nextUser) => {
    if (!nextUser) return null
    return syncUser(nextUser)
  }

  const refreshUser = async (targetUserId) => {
    const userId = targetUserId || user?.id
    if (!userId) return null

    const response = await ApiService.getUsuario(userId)
    if (!response?.usuario) return null

    return syncUser({ ...(user || {}), ...response.usuario })
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user && !!getToken(),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
