'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient, errorMessage } from '@/lib/api'
import { Subscription } from '@/lib/types'
import { SubscriptionsTable } from '@/components/SubscriptionsTable'
import { mergeSubscriptionWithOrg } from '@/lib/mappers'
import { canonicalSubscriptionStatus } from '@/lib/subscriptionStatus'

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [subsOutcome] = await Promise.allSettled([
        (async () => {
          const outcome = await apiClient.getSubscriptions({ page: 1, perPage: 500 })
          const orgIds = new Set<string>()
          for (const s of outcome.items) {
            if (s.organizationId) orgIds.add(s.organizationId)
          }
          const orgMap = await apiClient.getOrganizationsByIds(Array.from(orgIds))
          return outcome.items.map((s) =>
            mergeSubscriptionWithOrg(s, orgMap.get(s.organizationId))
          )
        })(),
      ])

      if (subsOutcome.status === 'fulfilled') {
        setSubscriptions(subsOutcome.value)
        setError(null)
      } else {
        setSubscriptions([])
        const first = subsOutcome as PromiseRejectedResult
        setError(
          `No se cargó: suscripciones.${first.reason ? ` ${errorMessage(first.reason, '')}` : ''}`
        )
      }
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar suscripciones'))
      setSubscriptions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const pendingCount = subscriptions.filter(
    (s) => canonicalSubscriptionStatus(s.status) === 'pending'
  ).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white/90">Suscripciones</h1>
        <p className="text-sm text-slate-500 dark:text-white/30 mt-0.5">
          Gestión unificada de planes y estados (pendiente, activa, rechazada, cancelada, vencida)
        </p>
      </div>

      {pendingCount > 0 && (
        <p className="text-xs text-amber-600/90 dark:text-amber-400/80">
          {pendingCount} {pendingCount === 1 ? 'suscripción pendiente' : 'suscripciones pendientes'} de
          aprobación
        </p>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center text-slate-600 dark:text-white/60">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm">Cargando…</p>
          </div>
        </div>
      ) : (
        <SubscriptionsTable initial={subscriptions} onRemoteUpdate={loadAll} />
      )}
    </div>
  )
}
