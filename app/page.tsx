'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { SubscriptionStats } from '@/lib/types'
import { StatsCards } from '@/components/StatsCards'
import { AnalyticsSection } from '@/components/AnalyticsSection'

const DEFAULT_STATS: SubscriptionStats = {
  active: 0,
  pending: 0,
  monthlyRevenue: 0,
  expiringThisWeek: 0,
}

export default function HomePage() {
  const [stats, setStats] = useState<SubscriptionStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const data = await apiClient.getSubscriptionStats()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
        setStats(DEFAULT_STATS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <div className="inline-block px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
            Herramienta de gestión
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white/90 mb-2">Gestor de Suscripciones</h1>
        <p className="text-sm text-white/40">
          Panel de control para administrar y monitorizar todas las suscripciones. Accede a las métricas en tiempo real y gestiona los planes desde la sección de suscripciones.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-white/60">
            <div className="text-2xl mb-2">⏳</div>
            <p>Cargando estadísticas...</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!isLoading && <StatsCards stats={stats} />}

      {/* Analytics Section */}
      <div className="bg-[#111827] rounded-xl border border-white/[0.06] p-4 md:p-6">
        <AnalyticsSection />
      </div>
    </div>
  )
}
