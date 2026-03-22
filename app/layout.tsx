import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export const metadata: Metadata = {
  title: 'Strova Admin · Suscripciones',
  description: 'Panel interno de gestión de suscripciones',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-[#0a0f1c]">
        <AuthProvider>
          <ProtectedRoute>
            <Sidebar />
            <main className="flex-1 min-h-screen overflow-y-auto ml-16 md:ml-0">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  )
}
