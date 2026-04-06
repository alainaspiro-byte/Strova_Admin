import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AppShell } from '@/components/AppShell'

const siteUrl =
  (typeof process.env.NEXT_PUBLIC_SITE_URL === 'string' && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
  (typeof process.env.VERCEL_URL === 'string' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Strova Admin · Suscripciones',
  description: 'Panel interno de gestión de suscripciones',
  icons: {
    icon: [{ url: '/strova-logo.png', type: 'image/png' }],
    apple: '/strova-logo.png',
  },
  openGraph: {
    title: 'Strova Admin · Suscripciones',
    description: 'Panel interno de gestión de suscripciones',
    images: ['/strova-logo.png'],
  },
  twitter: {
    card: 'summary',
    title: 'Strova Admin · Suscripciones',
    description: 'Panel interno de gestión de suscripciones',
    images: ['/strova-logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="flex min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
