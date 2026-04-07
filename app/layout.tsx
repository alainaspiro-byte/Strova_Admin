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
  /**
   * Favicon: `app/icon.svg` (marca que llena el lienzo; se ve mejor en pestaña que un PNG con mucho margen).
   * Apple / OG siguen con logo completo.
   */
  icons: {
    apple: [{ url: '/logo-claro.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Strova Admin · Suscripciones',
    description: 'Panel interno de gestión de suscripciones',
    images: ['/logo-claro.png'],
  },
  twitter: {
    card: 'summary',
    title: 'Strova Admin · Suscripciones',
    description: 'Panel interno de gestión de suscripciones',
    images: ['/logo-claro.png'],
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
