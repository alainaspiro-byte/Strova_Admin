import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Strova Admin · Suscripciones',
  description: 'Panel interno de gestión de suscripciones',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-[#0a0f1c]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
