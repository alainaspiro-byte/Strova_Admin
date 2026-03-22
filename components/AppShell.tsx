'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { ProtectedRoute } from '@/components/ProtectedRoute'

/**
 * La página /login debe renderizarse sin ProtectedRoute (si no, devuelve null y queda en blanco).
 * El resto de rutas va con sidebar y protección JWT.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <ProtectedRoute>
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto ml-16 md:ml-0">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </ProtectedRoute>
  )
}
