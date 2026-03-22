'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { errorMessage } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [authLoading, isAuthenticated, router])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      router.push('/')
    } catch (err) {
      setError(errorMessage(err, 'Error al iniciar sesión'))
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <p className="text-white/50 text-sm">Cargando…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <p className="text-white/50 text-sm">Redirigiendo al panel…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] to-[#1a2744] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-[#111827] rounded-2xl border border-white/10 p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                Strova Suscripciones
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Acceso Admin</h1>
            <p className="text-sm text-white/50">
              Inicia sesión para gestionar suscripciones
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 bg-[#1f2937] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition duration-200"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-white/40 text-center">
              Panel de administración de suscripciones
            </p>
          </div>
        </div>

        {/* Demo Credentials Info */}
        <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 text-center">
          <p>Usa tus credenciales de administrador</p>
        </div>
      </div>
    </div>
  )
}
