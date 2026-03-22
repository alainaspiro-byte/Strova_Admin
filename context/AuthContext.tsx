'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/api'

interface User {
  id: string
  email: string
  name?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verificar autenticación al montar el componente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          // Aquí podrías verificar el token con el backend
          // para ahora asumimos que si existe en localStorage es válido
          const userData = localStorage.getItem('user')
          if (userData) {
            setUser(JSON.parse(userData))
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setIsLoading(true)
      const response = await apiClient.login(email, password)
      
      const userData = {
        id: response.user?.id || email,
        email: response.user?.email || email,
        name: response.user?.name,
        role: response.user?.role,
      }
      
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
      setUser(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}
