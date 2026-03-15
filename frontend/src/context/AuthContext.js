'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import ApiService from '@/services/api'

const AuthContext = createContext(null)

export function getRedirectByUserType(user) {
  return user?.tipo === 'barbeiro' ? '/barbearia' : '/perfil'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar token ao carregar
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const login = async (email, senha) => {
    const response = await ApiService.login(email, senha)
    
    if (response.usuario) {
      localStorage.setItem('token', response.token || 'dummy-token')
      localStorage.setItem('user', JSON.stringify(response.usuario))
      setUser(response.usuario)
      return { success: true, usuario: response.usuario }
    }
    
    throw new Error(response.error || 'Erro ao fazer login')
  }

  const register = async (data) => {
    const response = await ApiService.register(data)
    
    if (response.usuario) {
      localStorage.setItem('token', response.token || 'dummy-token')
      localStorage.setItem('user', JSON.stringify(response.usuario))
      setUser(response.usuario)
      return { success: true, usuario: response.usuario }
    }
    
    throw new Error(response.error || 'Erro ao criar conta')
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
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
