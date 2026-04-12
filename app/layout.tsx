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
  title: 'TuCuadre Admin · Suscripciones',
  description: 'Panel interno de gestión de suscripciones TuCuadre',
  /** Favicon: marca TuCuadre (`public/tucuadre-favicon.png`). */
  icons: {
    icon: [{ url: '/tucuadre-favicon.png', type: 'image/png', sizes: 'any' }],
    apple: [{ url: '/tucuadre-favicon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'TuCuadre Admin · Suscripciones',
    description: 'Panel interno de gestión de suscripciones TuCuadre',
    images: ['/tucuadre-favicon.png'],
  },
  twitter: {
    card: 'summary',
    title: 'TuCuadre Admin · Suscripciones',
    description: 'Panel interno de gestión de suscripciones TuCuadre',
    images: ['/tucuadre-favicon.png'],
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
