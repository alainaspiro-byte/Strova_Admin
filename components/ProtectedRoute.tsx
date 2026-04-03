'use client'

import { useAuth } from '@/context/AuthContext'
import { ROLE_STORAGE_KEY, SUPERADMIN_ROLE_ID_VALUE } from '@/lib/authConstants'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, pathname, router])

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading || !isAuthenticated) return
    if (localStorage.getItem(ROLE_STORAGE_KEY) !== SUPERADMIN_ROLE_ID_VALUE) {
      void logout().then(() => router.replace('/login?forbidden=1'))
    }
  }, [isAuthenticated, isLoading, logout, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0a0f1c]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600 dark:text-white/60">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
