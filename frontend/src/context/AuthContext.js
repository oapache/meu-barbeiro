'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import ApiService from '@/services/api'

const AuthContext = createContext(null)

const LOCAL_TOKEN_KEY = 'token'
const LOCAL_USER_KEY = 'user'
const SESSION_TOKEN_KEY = 'session_token'
const SESSION_USER_KEY = 'session_user'

export function getRedirectByUserType(user) {
  return user?.tipo === 'barbeiro' ? '/barbearia' : '/perfil'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const persistAuthData = (usuario, token, rememberSession) => {
    const authToken = token || 'dummy-token'

    if (rememberSession) {
      localStorage.setItem(LOCAL_TOKEN_KEY, authToken)
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(usuario))
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
      sessionStorage.removeItem(SESSION_USER_KEY)
      return
    }

    sessionStorage.setItem(SESSION_TOKEN_KEY, authToken)
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(usuario))
    localStorage.removeItem(LOCAL_TOKEN_KEY)
    localStorage.removeItem(LOCAL_USER_KEY)
  }

  useEffect(() => {
    // Verificar token ao carregar (persistente ou somente sessao)
    const token = localStorage.getItem(LOCAL_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY)
    const userData = localStorage.getItem(LOCAL_USER_KEY) || sessionStorage.getItem(SESSION_USER_KEY)
    
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const login = async (email, senha, rememberSession = false) => {
    const response = await ApiService.login(email, senha)
    
    if (response.usuario) {
      persistAuthData(response.usuario, response.token, rememberSession)
      setUser(response.usuario)
      return { success: true, usuario: response.usuario }
    }
    
    throw new Error(response.error || 'Erro ao fazer login')
  }

  const register = async (data) => {
    const response = await ApiService.register(data)
    
    if (response.usuario) {
      persistAuthData(response.usuario, response.token, true)
      setUser(response.usuario)
      return { success: true, usuario: response.usuario }
    }
    
    throw new Error(response.error || 'Erro ao criar conta')
  }

  const logout = () => {
    localStorage.removeItem(LOCAL_TOKEN_KEY)
    localStorage.removeItem(LOCAL_USER_KEY)
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
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
