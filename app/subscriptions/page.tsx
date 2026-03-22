'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Subscription, SubscriptionStats } from '@/lib/types'
import { StatsCards } from '@/components/StatsCards'
import { SubscriptionsTable } from '@/components/SubscriptionsTable'

const DEFAULT_STATS: SubscriptionStats = {
  active: 0,
  pending: 0,
  monthlyRevenue: 0,
  expiringThisWeek: 0,
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [subData, statsData] = await Promise.all([
          apiClient.getSubscriptions(),
          apiClient.getSubscriptionStats(),
        ])
        setSubscriptions(subData.data || [])
        setStats(statsData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar suscripciones')
        setSubscriptions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-white/90">Suscripciones</h1>
        <p className="text-sm text-white/30 mt-0.5">Gestión de planes, pagos y renovaciones</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {!isLoading && <StatsCards stats={stats} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-white/60">
            <div className="text-2xl mb-2">⏳</div>
            <p>Cargando suscripciones...</p>
          </div>
        </div>
      ) : (
        <SubscriptionsTable initial={subscriptions} onDataChange={setSubscriptions} />
      )}
    </div>
  )
}
