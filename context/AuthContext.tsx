'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient, errorMessage } from '@/lib/api'
import { ROLE_STORAGE_KEY, SUPERADMIN_ROLE_ID_VALUE } from '@/lib/authConstants'
import { clearAuthStorage } from '@/lib/authSession'

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

  // Al montar: verificar token contra el backend
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')

        if (!token) {
          // No hay token → no está autenticado
          setIsLoading(false)
          return
        }

        // Verificar que el token sigue siendo válido en el backend
        await apiClient.verifyToken()

        const roleId = localStorage.getItem(ROLE_STORAGE_KEY)
        if (roleId !== SUPERADMIN_ROLE_ID_VALUE) {
          clearAuthStorage()
          setUser(null)
          setIsLoading(false)
          return
        }

        // Token válido y rol SuperAdmin → restaurar usuario desde localStorage
        const userData = localStorage.getItem('user')
        if (userData) {
          setUser(JSON.parse(userData))
        }
      } catch {
        // Token inválido o expirado → limpiar sesión silenciosamente
        clearAuthStorage()
        setUser(null)
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

      const userData: User = response.user
        ? {
            id: String(response.user.id),
            email: response.user.email,
            name: response.user.name,
            role: response.user.role,
          }
        : {
            id: email,
            email,
          }

      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (err) {
      const message = errorMessage(err, 'Error al iniciar sesión')
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setUser(null)
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