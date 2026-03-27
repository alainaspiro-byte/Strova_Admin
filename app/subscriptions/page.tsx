'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient, errorMessage } from '@/lib/api'
import { Subscription } from '@/lib/types'
import { SubscriptionsTable } from '@/components/SubscriptionsTable'
import { RequestsTable } from '@/components/RequestsTable'
import type { SubscriptionRequestRow } from '@/lib/mappers'

type Tab = 'subscriptions' | 'requests'

function statusLower(s: string): string {
  return String(s ?? '').trim().toLowerCase()
}

export default function SubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('subscriptions')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [requests, setRequests] = useState<SubscriptionRequestRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [subsOutcome, reqOutcome] = await Promise.allSettled([
        apiClient.getSubscriptions({ page: 1, perPage: 500 }),
        apiClient.getSubscriptionRequests({ page: 1, perPage: 500 }),
      ])

      const subsRes =
        subsOutcome.status === 'fulfilled' ? subsOutcome.value : { items: [], total: undefined }
      const reqRes =
        reqOutcome.status === 'fulfilled' ? reqOutcome.value : { items: [], total: undefined }

      setSubscriptions(subsRes.items)
      setRequests(reqRes.items)

      const pending = reqRes.items.filter((r) => statusLower(r.status) === 'pending').length
      setPendingCount(pending)

      const failed: string[] = []
      if (subsOutcome.status === 'rejected') failed.push('suscripciones')
      if (reqOutcome.status === 'rejected') failed.push('solicitudes')
      if (failed.length) {
        const first = [subsOutcome, reqOutcome].find(
          (o) => o.status === 'rejected'
        ) as PromiseRejectedResult | undefined
        setError(
          `No se cargó: ${failed.join(', ')}.${first ? ` ${errorMessage(first.reason, '')}` : ''}`
        )
      } else {
        setError(null)
      }
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar datos'))
      setSubscriptions([])
      setRequests([])
      setPendingCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white/90">Suscripciones</h1>
        <p className="text-sm text-slate-500 dark:text-white/30 mt-0.5">
          Gestión de planes, solicitudes y renovaciones
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 dark:bg-white/[0.04] dark:border-white/[0.06] w-fit">
        <button
          type="button"
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            tab === 'subscriptions'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white dark:shadow-none'
              : 'text-slate-600 hover:text-slate-900 dark:text-white/40 dark:hover:text-white/60'
          }`}
        >
          Suscripciones
          <span className="ml-1.5 tabular-nums text-slate-400 dark:text-white/25">
            {subscriptions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('requests')}
          className={`relative px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            tab === 'requests'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white dark:shadow-none'
              : 'text-slate-600 hover:text-slate-900 dark:text-white/40 dark:hover:text-white/60'
          }`}
        >
          Solicitudes
          {pendingCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white tabular-nums">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center text-slate-600 dark:text-white/60">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm">Cargando…</p>
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
