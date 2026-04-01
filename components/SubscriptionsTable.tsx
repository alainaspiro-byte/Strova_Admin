'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient, errorMessage, isApiError } from '@/lib/api'
import type { ApiSubscription, ApiPlan, ApiSubscriptionStatus } from '@/lib/subscriptionApiTypes'

const PER_PAGE = 10
const shell =
  'bg-white dark:bg-[#111827] rounded-xl border border-slate-200 shadow-sm dark:border-white/[0.06] dark:shadow-none overflow-hidden'
const modalPanel =
  'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 w-full max-w-md space-y-3 shadow-xl dark:shadow-none'
const field =
  'w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white'

type TabKey = 'all' | ApiSubscriptionStatus

const TABS: { key: TabKey; label: string; apiStatus?: ApiSubscriptionStatus }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes', apiStatus: 'pending' },
  { key: 'active', label: 'Activas', apiStatus: 'active' },
  { key: 'rejected', label: 'Rechazadas', apiStatus: 'rejected' },
  { key: 'cancelled', label: 'Canceladas', apiStatus: 'cancelled' },
  { key: 'expired', label: 'Vencidas', apiStatus: 'expired' },
]

function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatDateLong(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function waDigits(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

function StatusBadgeRow({ sub }: { sub: ApiSubscription }) {
  const st = sub.status
  const base =
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset'
  if (st === 'pending') {
    return (
      <span
        className={`${base} bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/25`}
      >
        Pendiente
      </span>
    )
  }
  if (st === 'active') {
    return (
      <span
        className={`${base} bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/25`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
        Activa
      </span>
    )
  }
  if (st === 'rejected') {
    return (
      <span
        className={`${base} bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/25`}
      >
        Rechazada
      </span>
    )
  }
  if (st === 'cancelled') {
    return (
      <span
        className={`${base} bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-white/30 dark:ring-white/10`}
      >
        Cancelada
      </span>
    )
  }
  if (st === 'expired') {
    return (
      <span
        className={`${base} bg-red-100 text-red-800 ring-red-200 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/25`}
      >
        Vencida
      </span>
    )
  }
  return <span className={base}>{st}</span>
}

function PendingExtraBadge({ sub }: { sub: ApiSubscription }) {
  if (sub.status !== 'pending' || sub.daysRemaining !== 0) return null
  return (
    <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-200/80 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
      Sin respuesta
    </span>
  )
}

function ExpirationCell({ sub }: { sub: ApiSubscription }) {
  const st = sub.status
  if (st === 'pending') {
    return <span className="text-xs text-slate-400 dark:text-white/25">—</span>
  }
  if (st === 'rejected' || st === 'cancelled') {
    return <span className="text-xs text-slate-400 dark:text-white/25">—</span>
  }
  if (st === 'expired') {
    return (
      <span className="text-xs font-medium text-red-600 dark:text-red-400">
        {formatDateShort(sub.endDate)}
      </span>
    )
  }
  if (st === 'active') {
    const dr = sub.daysRemaining
    const date = formatDateShort(sub.endDate)
    if (dr === 0) {
      return (
        <div>
          <div className="text-xs text-slate-600 dark:text-white/50">{date}</div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">Vence hoy</div>
        </div>
      )
    }
    const warn = dr <= 7
    return (
      <div>
        <div className="text-xs text-slate-600 dark:text-white/50">{date}</div>
        <div
          className={`text-xs mt-0.5 ${
            warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-white/20'
          }`}
        >
          {dr} días
        </div>
      </div>
    )
  }
  return <span className="text-xs text-slate-400 dark:text-white/25">—</span>
}

function buildWaMessage(sub: ApiSubscription): string {
  const name = sub.adminContact?.fullName ?? sub.organization.name
  const plan = sub.plan.displayName
  const monthly = sub.plan.monthlyPrice
  const end = formatDateLong(sub.endDate)

  if (sub.status === 'pending') {
    return `Hola ${name}, te contactamos desde Strova para confirmar el pago de tu solicitud al plan ${plan} ($${monthly}/mes). Por favor confírmanos cuando hayas realizado el pago.`
  }
  if (sub.status === 'active') {
    return `Hola ${name}, tu suscripción al plan ${plan} en Strova vence el ${end}. ¿Deseas renovarla?`
  }
  if (sub.status === 'expired') {
    return `Hola ${name}, tu suscripción al plan ${plan} en Strova venció el ${end}. ¿Te gustaría renovarla?`
  }
  if (sub.status === 'cancelled') {
    return `Hola ${name}, tu suscripción al plan ${plan} en Strova está cancelada (vencía el ${end}). ¿Te gustaría renovarla?`
  }
  if (sub.status === 'rejected') {
    return `Hola ${name}, te contactamos desde Strova sobre tu solicitud del plan ${plan}. Si quieres retomar el alta o aclarar algo, escríbenos.`
  }
  return ''
}

export function SubscriptionsTable() {
  const [tab, setTab] = useState<TabKey>('all')
  const [planId, setPlanId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [items, setItems] = useState<ApiSubscription[]>([])
  const [pagination, setPagination] = useState<import('@/lib/subscriptionApiTypes').SubscriptionPagination | null>(
    null
  )
  const [requestMap, setRequestMap] = useState<Map<number, number>>(new Map())
  const [rejectedRequestMap, setRejectedRequestMap] = useState<Map<number, number>>(new Map())
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [tabCounts, setTabCounts] = useState<Partial<Record<TabKey, number>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [modal, setModal] = useState<
    'none' | 'approve' | 'reject' | 'change' | 'renew' | 'cancel'
  >('none')
  const [activeSub, setActiveSub] = useState<ApiSubscription | null>(null)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [planPick, setPlanPick] = useState<number>(0)
  const [cyclePick, setCyclePick] = useState<'monthly' | 'annual'>('monthly')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const loadTabCounts = useCallback(async () => {
    try {
      const [all, pending, active, rejected, cancelled, expired] = await Promise.all([
        apiClient.getSubscriptionList({ page: 1, perPage: 1, status: 'all' }).then((r) => r.pagination?.totalCount ?? 0),
        apiClient.getSubscriptionStatusCount('pending'),
        apiClient.getSubscriptionStatusCount('active'),
        apiClient.getSubscriptionStatusCount('rejected'),
        apiClient.getSubscriptionStatusCount('cancelled'),
        apiClient.getSubscriptionStatusCount('expired'),
      ])
      setTabCounts({
        all,
        pending,
        active,
        rejected,
        cancelled,
        expired,
      })
    } catch {
      /* conteos opcionales */
    }
  }, [])

  const loadPlans = useCallback(async () => {
    try {
      const list = await apiClient.getPlansCatalogApi()
      setPlans(list.filter((p) => p.isActive))
    } catch {
      setPlans([])
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const statusFilter =
        tab === 'all' ? 'all' : (tab as ApiSubscriptionStatus)
      const [listRes, mapPending, mapRejected] = await Promise.all([
        apiClient.getSubscriptionList({
          page,
          perPage: PER_PAGE,
          status: statusFilter,
          planId: planId ?? undefined,
        }),
        apiClient.getPendingSubscriptionRequestMap(),
        apiClient.getRejectedSubscriptionRequestMap(),
      ])
      setItems(listRes.items)
      setPagination(listRes.pagination)
      setRequestMap(mapPending)
      setRejectedRequestMap(mapRejected)
    } catch (e) {
      setError(
        isApiError(e) && e.status === 403
          ? 'Sin permisos'
          : errorMessage(e, 'Error al cargar datos')
      )
      setItems([])
      setPagination(null)
      setRequestMap(new Map())
      setRejectedRequestMap(new Map())
    } finally {
      setLoading(false)
    }
  }, [tab, page, planId])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadTabCounts()
  }, [loadTabCounts])

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return items
    return items.filter((s) => s.organization.name.toLowerCase().includes(q))
  }, [items, debouncedSearch])

  const closeModal = () => {
    setModal('none')
    setActiveSub(null)
    setNotes('')
    setPaymentRef('')
    setBusy(false)
  }

  const showToast = (type: 'ok' | 'err', text: string) => setToast({ type, text })

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true)
    try {
      await fn()
      showToast('ok', successMsg)
      closeModal()
      await loadData()
      await loadTabCounts()
    } catch (e) {
      showToast('err', errorMessage(e, 'Error'))
    } finally {
      setBusy(false)
    }
  }

  const selectTab = (k: TabKey) => {
    setTab(k)
    setPage(1)
  }

  const selectPlan = (id: number | null) => {
    setPlanId(id)
    setPage(1)
  }

  const openApprove = (sub: ApiSubscription) => {
    setActiveSub(sub)
    setNotes('')
    setPaymentRef('')
    setModal('approve')
  }

  const openReject = (sub: ApiSubscription) => {
    setActiveSub(sub)
    setNotes('')
    setModal('reject')
  }

  const openChange = (sub: ApiSubscription) => {
    setActiveSub(sub)
    setNotes('')
    setPaymentRef('')
    setPlanPick(sub.plan.id)
    setCyclePick(sub.billingCycle)
    setModal('change')
  }

  const openRenew = (sub: ApiSubscription) => {
    setActiveSub(sub)
    setNotes('')
    setPaymentRef('')
    setCyclePick(sub.billingCycle)
    setModal('renew')
  }

  const openCancel = (sub: ApiSubscription) => {
    setActiveSub(sub)
    setNotes('')
    setModal('cancel')
  }

  const totalCount = pagination?.totalCount ?? 0
  const currentPage = pagination?.currentPage ?? page

  /** Id de solicitud para aprobar: pendientes desde cola pending; rechazadas desde cola rejected (re-aprobación). */
  const resolveRequestIdForApprove = (sub: ApiSubscription) =>
    sub.status === 'rejected'
      ? rejectedRequestMap.get(sub.id) ?? requestMap.get(sub.id)
      : requestMap.get(sub.id)

  const emptyMessage = () => {
    if (debouncedSearch.trim()) return 'No hay resultados para tu búsqueda'
    switch (tab) {
      case 'pending':
        return 'No hay suscripciones pendientes'
      case 'active':
        return 'No hay suscripciones activas'
      case 'rejected':
        return 'No hay suscripciones rechazadas'
      case 'cancelled':
        return 'No hay suscripciones canceladas'
      case 'expired':
        return 'No hay suscripciones vencidas'
      default:
        return 'No hay suscripciones'
    }
  }

  return (
    <div className="space-y-3">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[200] max-w-sm px-4 py-3 rounded-lg text-sm shadow-lg border ${
            toast.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/15 border-red-500/30 text-red-200'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className={shell}>
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.06] space-y-3">
          <div className="flex flex-wrap gap-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => selectTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-white/30 dark:hover:text-white/60 dark:hover:bg-white/[0.04]'
                }`}
              >
                {t.label}
                <span className="ml-1.5 tabular-nums text-slate-400 dark:text-white/25">
                  ({tabCounts[t.key] ?? '—'})
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-white/30">Plan:</span>
            <select
              value={planId ?? ''}
              onChange={(e) =>
                selectPlan(e.target.value === '' ? null : Number(e.target.value))
              }
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-1 focus:ring-blue-500/50 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/70"
            >
              <option value="">Todos los planes</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar por negocio…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500/50 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/70"
              />
            </div>
          </div>
        </div>

        {error && !loading && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.06] space-y-2">
            <p className="text-sm text-red-400">⚠️ {error}</p>
            <button
              type="button"
              onClick={() => loadData()}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.04]">
                {['Negocio', 'Plan', 'Estado', 'Vencimiento', 'WhatsApp', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[10px] font-semibold text-slate-400 dark:text-white/20 uppercase tracking-widest px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: PER_PAGE }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-white/[0.03]">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-16 text-center text-sm text-slate-400 dark:text-white/20" colSpan={6}>
                    {emptyMessage()}
                  </td>
                </tr>
              ) : (
                filteredItems.map((sub) => {
                  const reqId =
                    sub.status === 'rejected'
                      ? resolveRequestIdForApprove(sub)
                      : requestMap.get(sub.id)
                  const phone = sub.adminContact?.phone
                  const digits = waDigits(phone)
                  const msg = buildWaMessage(sub)
                  const canWa =
                    digits &&
                    (sub.status === 'pending' ||
                      sub.status === 'active' ||
                      sub.status === 'rejected' ||
                      sub.status === 'expired' ||
                      sub.status === 'cancelled')

                  return (
                    <tr
                      key={sub.id}
                      className="border-b border-slate-200 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-sm text-slate-800 dark:text-white/80">
                          {sub.organization.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-white/25 font-mono">
                          {sub.organization.code}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-white/50">
                        {sub.plan.displayName}
                        <span className="text-slate-400 dark:text-white/25"> · </span>
                        {sub.billingCycle === 'annual' ? 'Anual' : 'Mensual'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <StatusBadgeRow sub={sub} />
                          <PendingExtraBadge sub={sub} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <ExpirationCell sub={sub} />
                      </td>
                      <td className="px-4 py-3.5">
                        {canWa ? (
                          <a
                            href={`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            title="WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ActionsCell
                          sub={sub}
                          requestId={reqId}
                          onApprove={() => openApprove(sub)}
                          onReject={() => openReject(sub)}
                          onChange={() => openChange(sub)}
                          onRenew={() => openRenew(sub)}
                          onCancel={() => openCancel(sub)}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && pagination && totalCount > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.04] flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400 dark:text-white/20">
              Mostrando
              {filteredItems.length === 0
                ? ' 0 '
                : ` ${(currentPage - 1) * (pagination.pageSize || PER_PAGE) + 1}–${(currentPage - 1) * (pagination.pageSize || PER_PAGE) + filteredItems.length} `}
              de {totalCount} suscripciones
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {modal === 'approve' && activeSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {activeSub.status === 'rejected' ? 'Aprobar suscripción rechazada' : 'Aprobar solicitud'}
            </h3>
            {activeSub.status === 'rejected' && (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100/95 leading-relaxed"
              >
                <span className="font-semibold">¿Está seguro?</span> Va a aprobar una suscripción que consta como{' '}
                <strong>rechazada</strong>. El estado pasará a aprobado/activo según el servidor. Revise referencia de
                pago y notas antes de confirmar.
              </div>
            )}
            <input
              placeholder="Referencia de pago (opcional)"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className={field}
              disabled={busy}
            />
            <textarea
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[60px]`}
              disabled={busy}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={closeModal}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !resolveRequestIdForApprove(activeSub)}
                title={!resolveRequestIdForApprove(activeSub) ? 'Solicitud no encontrada' : undefined}
                onClick={() => {
                  const rid = resolveRequestIdForApprove(activeSub)
                  if (!rid) return
                  runAction(
                    () =>
                      apiClient.approveSubscriptionRequest(rid, {
                        notes: notes || '',
                        paymentReference: paymentRef || '',
                      }),
                    `Suscripción de ${activeSub.organization.name} aprobada correctamente`
                  )
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 text-emerald-400 disabled:opacity-40"
              >
                {busy ? '…' : activeSub.status === 'rejected' ? 'Sí, aprobar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'reject' && activeSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Rechazar solicitud</h3>
            <textarea
              placeholder="Motivo (obligatorio)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[72px]`}
              disabled={busy}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={closeModal}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !notes.trim() || !requestMap.get(activeSub.id)}
                title={!requestMap.get(activeSub.id) ? 'Solicitud no encontrada' : undefined}
                onClick={() => {
                  const rid = requestMap.get(activeSub.id)
                  if (!rid) return
                  runAction(
                    () => apiClient.rejectSubscriptionRequest(rid, { notes: notes.trim() }),
                    `Solicitud de ${activeSub.organization.name} rechazada`
                  )
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 disabled:opacity-40"
              >
                {busy ? '…' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'change' && activeSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cambiar plan</h3>
            <label className="block text-[11px] text-slate-500 dark:text-white/50">Plan</label>
            <select
              value={planPick}
              onChange={(e) => setPlanPick(Number(e.target.value))}
              className={field}
              disabled={busy}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
            <label className="block text-[11px] text-slate-500 dark:text-white/50">Ciclo</label>
            <select
              value={cyclePick}
              onChange={(e) => setCyclePick(e.target.value as 'monthly' | 'annual')}
              className={field}
              disabled={busy}
            >
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
            <input
              placeholder="Referencia de pago (opcional)"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className={field}
              disabled={busy}
            />
            <textarea
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[50px]`}
              disabled={busy}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={closeModal}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !planPick}
                onClick={() =>
                  runAction(
                    () =>
                      apiClient.changePlanSubscription(activeSub.id, {
                        planId: planPick,
                        billingCycle: cyclePick,
                        notes: notes || '',
                        paymentReference: paymentRef || '',
                      }),
                    `Plan actualizado para ${activeSub.organization.name}`
                  )
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 text-blue-400"
              >
                {busy ? '…' : 'Cambiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'renew' && activeSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Renovar suscripción</h3>
            <p className="text-xs text-slate-600 dark:text-white/50">
              {activeSub.organization.name} · vencidas o canceladas
            </p>
            <label className="block text-[11px] text-slate-500 dark:text-white/50">Ciclo de facturación</label>
            <select
              value={cyclePick}
              onChange={(e) => setCyclePick(e.target.value as 'monthly' | 'annual')}
              className={field}
              disabled={busy}
            >
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
            <input
              placeholder="Referencia de pago (opcional)"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className={field}
              disabled={busy}
            />
            <textarea
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[50px]`}
              disabled={busy}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={closeModal}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(
                    () =>
                      apiClient.renewSubscription(activeSub.id, {
                        billingCycle: cyclePick,
                        paymentReference: paymentRef.trim(),
                        notes: notes.trim(),
                      }),
                    `Suscripción de ${activeSub.organization.name} renovada`
                  )
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 text-amber-400"
              >
                {busy ? '…' : 'Renovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cancel' && activeSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dar de baja</h3>
            <p className="text-xs text-slate-600 dark:text-white/50">
              Se cancelará la suscripción activa de {activeSub.organization.name}. Esta acción la marca como
              cancelada en el sistema.
            </p>
            <textarea
              placeholder="Motivo o notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[72px]`}
              disabled={busy}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={closeModal}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(
                    () =>
                      apiClient.cancelSubscription(activeSub.id, {
                        notes: notes.trim() || undefined,
                      }),
                    `Suscripción de ${activeSub.organization.name} cancelada`
                  )
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400"
              >
                {busy ? '…' : 'Confirmar baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionsCell({
  sub,
  requestId,
  onApprove,
  onReject,
  onChange,
  onRenew,
  onCancel,
}: {
  sub: ApiSubscription
  requestId: number | undefined
  onApprove: () => void
  onReject: () => void
  onChange: () => void
  onRenew: () => void
  onCancel: () => void
}) {
  const st = sub.status
  if (st === 'pending') {
    const missing = !requestId
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        <button
          type="button"
          onClick={onApprove}
          disabled={missing}
          title={missing ? 'Solicitud no encontrada' : undefined}
          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-40"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={missing}
          title={missing ? 'Solicitud no encontrada' : undefined}
          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-40"
        >
          Rechazar
        </button>
      </div>
    )
  }
  if (st === 'rejected') {
    const missing = !requestId
    return (
      <button
        type="button"
        onClick={onApprove}
        disabled={missing}
        title={missing ? 'Solicitud no encontrada' : 'Aprobar y activar suscripción'}
        className="px-2 py-1 rounded-lg text-[11px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-40"
      >
        Aprobar
      </button>
    )
  }
  if (st === 'active') {
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        <button
          type="button"
          onClick={onChange}
          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          Cambiar plan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-500/15 text-slate-400 hover:bg-slate-500/25"
        >
          Dar de baja
        </button>
      </div>
    )
  }
  if (st === 'expired' || st === 'cancelled') {
    return (
      <button
        type="button"
        onClick={onRenew}
        className="px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
      >
        Renovar
      </button>
    )
  }
  return <span className="text-[11px] text-slate-400 dark:text-white/20">—</span>
}
