'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient, computeDashboardStats, errorMessage } from '@/lib/api'
import { Subscription, SubscriptionStats } from '@/lib/types'
import { StatsCards } from '@/components/StatsCards'
import { SubscriptionsTable } from '@/components/SubscriptionsTable'
import { RequestsTable } from '@/components/RequestsTable'
import type { SubscriptionRequestRow } from '@/lib/mappers'

const DEFAULT_STATS: SubscriptionStats = {
  active: 0,
  pending: 0,
  monthlyRevenue: 0,
  expiringThisWeek: 0,
}

type Tab = 'subscriptions' | 'requests'

export default function SubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('subscriptions')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [requests, setRequests] = useState<SubscriptionRequestRow[]>([])
  const [stats, setStats] = useState<SubscriptionStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [subsOutcome, reqOutcome, pendingOutcome] = await Promise.allSettled([
        apiClient.getSubscriptions({ page: 1, perPage: 500 }),
        apiClient.getSubscriptionRequests({ page: 1, perPage: 500 }),
        apiClient.getSubscriptionRequests({ page: 1, perPage: 500, status: 'pending' }),
      ])

      const subsRes =
        subsOutcome.status === 'fulfilled' ? subsOutcome.value : { items: [], total: undefined }
      const reqRes =
        reqOutcome.status === 'fulfilled' ? reqOutcome.value : { items: [], total: undefined }
      const pendingReqRes =
        pendingOutcome.status === 'fulfilled'
          ? pendingOutcome.value
          : { items: [], total: undefined }

      setSubscriptions(subsRes.items)
      setRequests(reqRes.items)

      const pendingCount = pendingReqRes.total ?? pendingReqRes.items.length
      setStats(computeDashboardStats(subsRes.items, pendingCount))

      const failed: string[] = []
      if (subsOutcome.status === 'rejected') failed.push('suscripciones')
      if (reqOutcome.status === 'rejected') failed.push('solicitudes')
      if (pendingOutcome.status === 'rejected') failed.push('solicitudes pendientes')
      if (failed.length) {
        const first = [subsOutcome, reqOutcome, pendingOutcome].find((o) => o.status === 'rejected') as
          | PromiseRejectedResult
          | undefined
        const detail = first ? errorMessage(first.reason, 'Error') : ''
        setError(
          `No se cargó: ${failed.join(', ')}.${detail ? ` ${detail}` : ''}`
        )
      } else {
        setError(null)
      }
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar datos'))
      setSubscriptions([])
      setRequests([])
      setStats(DEFAULT_STATS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-white/90">Suscripciones</h1>
        <p className="text-sm text-white/30 mt-0.5">Gestión de planes, solicitudes y renovaciones (API con permiso subscription.manage)</p>
      </div>

      <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] w-fit">
        <button
          type="button"
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            tab === 'subscriptions' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Suscripciones
        </button>
        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            tab === 'requests' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Solicitudes
        </button>
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
            <p>Cargando…</p>
          </div>
        </div>
      ) : tab === 'subscriptions' ? (
        <SubscriptionsTable initial={subscriptions} onRemoteUpdate={loadAll} />
      ) : (
        <RequestsTable initial={requests} onRemoteUpdate={loadAll} />
      )}
    </div>
  )
}
