'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient, errorMessage, isApiError } from '@/lib/api'
import type { ApiSubscription } from '@/lib/subscriptionApiTypes'
import type { ApiUserDetail, OrganizationEntity } from '@/lib/organizationApiTypes'
import type { SubscriptionRequestRow } from '@/lib/mappers'

const PER_PAGE = 10

const shell =
  'bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none overflow-hidden'
const modalPanel =
  'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 w-full max-w-md space-y-3 shadow-xl dark:shadow-none'

type SubscriptionFilterKey = 'all' | 'active' | 'pending' | 'none'
type VerificationFilterKey = 'all' | 'verified' | 'unverified'

function waDigits(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

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
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function buildSubscriptionMap(items: ApiSubscription[]): Map<number, ApiSubscription> {
  const byOrg = new Map<number, ApiSubscription[]>()
  for (const s of items) {
    const id = s.organization.id
    if (!byOrg.has(id)) byOrg.set(id, [])
    byOrg.get(id)!.push(s)
  }
  const priority = (s: ApiSubscription) =>
    ({ active: 5, pending: 4, cancelled: 3, expired: 2, rejected: 1 } as const)[s.status] ?? 0
  const map = new Map<number, ApiSubscription>()
  byOrg.forEach((subs, oid) => {
    subs.sort((a, b) => priority(b) - priority(a) || b.id - a.id)
    map.set(oid, subs[0])
  })
  return map
}

async function fetchAllOrganizations(): Promise<OrganizationEntity[]> {
  const first = await apiClient.getOrganizationList({ page: 1, perPage: 10 })
  const items = [...first.items]
  const tp = first.pagination?.totalPages ?? 1
  if (tp > 1) {
    const rest = await Promise.all(
      Array.from({ length: tp - 1 }, (_, i) =>
        apiClient.getOrganizationList({ page: i + 2, perPage: 10 })
      )
    )
    for (const r of rest) items.push(...r.items)
  }
  return items
}

async function fetchAllSubscriptionsList(): Promise<ApiSubscription[]> {
  const first = await apiClient.getSubscriptionList({ page: 1, perPage: 500, status: 'all' })
  const items = [...first.items]
  const tp = first.pagination?.totalPages ?? 1
  if (tp > 1) {
    const rest = await Promise.all(
      Array.from({ length: tp - 1 }, (_, i) =>
        apiClient.getSubscriptionList({ page: i + 2, perPage: 500, status: 'all' })
      )
    )
    for (const r of rest) items.push(...r.items)
  }
  return items
}

function SubscriptionStatusBadge({ sub }: { sub: ApiSubscription | null }) {
  const base =
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset'
  if (!sub) {
    return (
      <span
        className={`${base} bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-white/30 dark:ring-white/10`}
      >
        Sin suscripción
      </span>
    )
  }
  const st = sub.status
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

function PlanNameBadge({ displayName }: { displayName: string | null }) {
  if (!displayName) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-white/30">
        Sin plan
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
      {displayName}
    </span>
  )
}

function OrgVerificationBadge({ verified }: { verified: boolean }) {
  const base = 'inline-flex px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset'
  if (verified) {
    return (
      <span
        className={`${base} bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/25`}
      >
        Verificada
      </span>
    )
  }
  return (
    <span
      className={`${base} bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-white/30 dark:ring-white/10`}
    >
      Sin verificar
    </span>
  )
}

function requestTypeLabel(t: string): string {
  switch (t.toLowerCase()) {
    case 'new':
      return 'Nueva suscripción'
    case 'plan_change':
      return 'Cambio de plan'
    case 'renewal':
      return 'Renovación'
    case 'cancellation':
      return 'Cancelación'
    default:
      return t || '—'
  }
}

function RequestStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const base =
    'inline-flex px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset'
  if (s === 'approved') {
    return (
      <span
        className={`${base} bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/25`}
      >
        Aprobada
      </span>
    )
  }
  if (s === 'rejected') {
    return (
      <span
        className={`${base} bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/25`}
      >
        Rechazada
      </span>
    )
  }
  if (s === 'pending') {
    return (
      <span
        className={`${base} bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/25`}
      >
        Pendiente
      </span>
    )
  }
  return (
    <span className={`${base} bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-white/30`}>{status}</span>
  )
}

export function OrganizationsTable() {
  const [organizations, setOrganizations] = useState<OrganizationEntity[]>([])
  const [subscriptionMap, setSubscriptionMap] = useState<Map<number, ApiSubscription>>(() => new Map())
  const [requestRows, setRequestRows] = useState<SubscriptionRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilterKey>('all')
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilterKey>('all')
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [detailOrgId, setDetailOrgId] = useState<number | null>(null)
  const [adminUser, setAdminUser] = useState<ApiUserDetail | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)

  const [confirmModal, setConfirmModal] = useState<
    { kind: 'verify' | 'unverify'; orgId: number } | null
  >(null)
  const [verifyBusy, setVerifyBusy] = useState(false)

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orgs, subs, requests] = await Promise.all([
        fetchAllOrganizations(),
        fetchAllSubscriptionsList(),
        apiClient.fetchAllSubscriptionRequests(),
      ])
      setOrganizations(orgs)
      setSubscriptionMap(buildSubscriptionMap(subs))
      setRequestRows(requests)
      setPage(1)
    } catch (e) {
      setError(
        isApiError(e) && e.status === 403
          ? 'Sin permisos'
          : errorMessage(e, 'No se pudieron cargar las organizaciones')
      )
      setOrganizations([])
      setSubscriptionMap(new Map())
      setRequestRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const detailOrg = useMemo(() => {
    if (detailOrgId == null) return null
    return organizations.find((o) => o.id === detailOrgId) ?? null
  }, [detailOrgId, organizations])

  const detailSub = detailOrg ? subscriptionMap.get(detailOrg.id) ?? null : null

  useEffect(() => {
    if (detailOrgId == null) {
      setAdminUser(null)
      setAdminLoading(false)
      return
    }
    const sub = subscriptionMap.get(detailOrgId)
    const uid = sub?.adminContact?.userId
    if (!uid) {
      setAdminUser(null)
      setAdminLoading(false)
      return
    }
    let cancelled = false
    setAdminLoading(true)
    setAdminUser(null)
    apiClient
      .getUserById(uid)
      .then((u) => {
        if (!cancelled) setAdminUser(u)
      })
      .catch(() => {
        if (!cancelled) setAdminUser(null)
      })
      .finally(() => {
        if (!cancelled) setAdminLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [detailOrgId, subscriptionMap])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return organizations.filter((org) => {
      if (q && !org.name.toLowerCase().includes(q)) return false
      const sub = subscriptionMap.get(org.id)
      if (subscriptionFilter === 'none') {
        if (sub) return false
      } else if (subscriptionFilter === 'active') {
        if (!sub || sub.status !== 'active') return false
      } else if (subscriptionFilter === 'pending') {
        if (!sub || sub.status !== 'pending') return false
      }
      if (verificationFilter === 'verified' && !org.isVerified) return false
      if (verificationFilter === 'unverified' && org.isVerified) return false
      return true
    })
  }, [organizations, subscriptionMap, debouncedSearch, subscriptionFilter, verificationFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageSlice = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  const showToast = (type: 'ok' | 'err', text: string) => setToast({ type, text })

  const patchOrgVerified = (orgId: number, isVerified: boolean) => {
    setOrganizations((prev) => prev.map((o) => (o.id === orgId ? { ...o, isVerified } : o)))
  }

  const runVerification = async () => {
    if (!confirmModal) return
    const org = organizations.find((o) => o.id === confirmModal.orgId)
    if (!org) return
    const next = confirmModal.kind === 'verify'
    setVerifyBusy(true)
    try {
      await apiClient.setOrganizationVerification(org.id, next)
      patchOrgVerified(org.id, next)
      showToast(
        'ok',
        next
          ? `Organización ${org.name} verificada correctamente`
          : `Verificación eliminada de ${org.name}`
      )
      setConfirmModal(null)
    } catch (e) {
      showToast('err', errorMessage(e, 'Error al actualizar'))
    } finally {
      setVerifyBusy(false)
    }
  }

  const historyForOrg = useCallback(
    (orgId: number) => {
      const list = requestRows.filter((r) => Number(r.organizationId) === orgId)
      return list.sort((a, b) => {
        const ta = new Date(a.createdAt).getTime()
        const tb = new Date(b.createdAt).getTime()
        return tb - ta
      })
    },
    [requestRows]
  )

  const start = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const end = Math.min(page * PER_PAGE, filtered.length)

  return (
    <div className="space-y-4">
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

      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
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
            placeholder="Buscar por nombre de organización…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm w-full bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#1a2332] dark:border-white/[0.08] dark:text-white dark:placeholder-white/40"
          />
        </div>

        <select
          value={subscriptionFilter}
          onChange={(e) => {
            setSubscriptionFilter(e.target.value as SubscriptionFilterKey)
            setPage(1)
          }}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50 dark:bg-[#1a2332] dark:border-white/[0.08] dark:text-white/80"
        >
          <option value="all">Estado suscripción: Todas</option>
          <option value="active">Activas</option>
          <option value="pending">Pendientes</option>
          <option value="none">Sin suscripción</option>
        </select>

        <select
          value={verificationFilter}
          onChange={(e) => {
            setVerificationFilter(e.target.value as VerificationFilterKey)
            setPage(1)
          }}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50 dark:bg-[#1a2332] dark:border-white/[0.08] dark:text-white/80"
        >
          <option value="all">Verificación: Todas</option>
          <option value="verified">Verificadas</option>
          <option value="unverified">Sin verificar</option>
        </select>
      </div>

      {error && !loading && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
          <p className="text-sm text-red-400">⚠️ {error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className={shell}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06]">
              <tr>
                {[
                  'Organización',
                  'Admin',
                  'Teléfono',
                  'Plan',
                  'Estado',
                  'Ubicaciones',
                  'Verificada',
                  'Acciones',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
              {loading ? (
                Array.from({ length: PER_PAGE }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500 dark:text-white/40 text-sm"
                  >
                    No hay organizaciones que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                pageSlice.map((org) => {
                  const sub = subscriptionMap.get(org.id) ?? null
                  const admin = sub?.adminContact
                  const phone = admin?.phone ?? null
                  const digits = waDigits(phone)
                  const waMsg = admin?.fullName
                    ? `Hola ${admin.fullName}, te contactamos desde el equipo de Strova.`
                    : 'Hola, te contactamos desde el equipo de Strova.'

                  return (
                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-[#111827]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">{org.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-white/35 font-mono">{org.code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">
                        {admin?.fullName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {!phone ? (
                          '—'
                        ) : (
                          <a
                            href={`https://wa.me/${digits}?text=${encodeURIComponent(waMsg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {phone}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PlanNameBadge displayName={sub?.plan.displayName ?? null} />
                      </td>
                      <td className="px-4 py-3">
                        <SubscriptionStatusBadge sub={sub} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-white/60">
                        {org.locations.length === 0 ? '—' : org.locations.length}
                      </td>
                      <td className="px-4 py-3">
                        <OrgVerificationBadge verified={org.isVerified} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {!org.isVerified ? (
                            <button
                              type="button"
                              disabled={verifyBusy}
                              onClick={() => setConfirmModal({ kind: 'verify', orgId: org.id })}
                              className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                            >
                              Verificar
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={verifyBusy}
                              onClick={() => setConfirmModal({ kind: 'unverify', orgId: org.id })}
                              className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/15 disabled:opacity-50"
                            >
                              Quitar verificación
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailOrgId(org.id)}
                            className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
                          >
                            Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-white/40">
              Mostrando {start}–{end} de {filtered.length} organizaciones
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-40 text-slate-700 dark:text-white/70"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-40 text-slate-700 dark:text-white/70"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <p className="text-sm text-slate-800 dark:text-white/90">
              {confirmModal.kind === 'verify'
                ? `¿Verificar la organización ${organizations.find((o) => o.id === confirmModal.orgId)?.name ?? ''}?`
                : `¿Quitar la verificación de ${organizations.find((o) => o.id === confirmModal.orgId)?.name ?? ''}?`}
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={verifyBusy}
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={verifyBusy}
                onClick={() => runVerification()}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 text-blue-300 disabled:opacity-40"
              >
                {verifyBusy ? '…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOrgId != null && (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar panel"
            onClick={() => setDetailOrgId(null)}
          />
          <aside className="absolute inset-y-0 right-0 w-[480px] max-w-full bg-white dark:bg-[#1a2332] border-l border-slate-200 dark:border-white/[0.08] shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/[0.06]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detalle</h2>
              <button
                type="button"
                onClick={() => setDetailOrgId(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
              {!detailOrg ? (
                <p className="text-slate-500 dark:text-white/40">Organización no encontrada.</p>
              ) : (
                <>
                  <section>
                    <h3 className="text-slate-500 dark:text-white/50 text-xs uppercase tracking-wider mb-2">
                      Información de la organización
                    </h3>
                    <dl className="space-y-2 text-slate-800 dark:text-white/90">
                      <div>
                        <dt className="text-slate-500 dark:text-white/40 text-xs">Nombre</dt>
                        <dd className="font-medium">{detailOrg.name}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40 text-xs">Código</dt>
                        <dd className="font-mono text-xs">{detailOrg.code}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40 text-xs">Descripción</dt>
                        <dd>{detailOrg.description ?? 'Sin descripción'}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40 text-xs">Alta</dt>
                        <dd>{formatDateLong(detailOrg.createdAt)}</dd>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <OrgVerificationBadge verified={detailOrg.isVerified} />
                        {!detailOrg.isVerified ? (
                          <button
                            type="button"
                            disabled={verifyBusy}
                            onClick={() => setConfirmModal({ kind: 'verify', orgId: detailOrg.id })}
                            className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          >
                            Verificar
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={verifyBusy}
                            onClick={() => setConfirmModal({ kind: 'unverify', orgId: detailOrg.id })}
                            className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10"
                          >
                            Quitar verificación
                          </button>
                        )}
                      </div>
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-slate-500 dark:text-white/50 text-xs uppercase tracking-wider mb-2">Admin</h3>
                    {!detailSub?.adminContact ? (
                      <p className="text-slate-600 dark:text-white/50">Sin admin registrado</p>
                    ) : adminLoading ? (
                      <p className="text-slate-500 dark:text-white/40">Cargando datos del admin…</p>
                    ) : !adminUser ? (
                      <p className="text-slate-600 dark:text-white/50">No se pudieron cargar los datos del usuario.</p>
                    ) : (
                      <dl className="space-y-2 text-slate-800 dark:text-white/90">
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Nombre</dt>
                          <dd>{adminUser.fullName}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Email</dt>
                          <dd>{adminUser.email || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Teléfono</dt>
                          <dd>{adminUser.phone ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Estado</dt>
                          <dd>
                            {adminUser.status === 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                                Activo
                              </span>
                            ) : (
                              <span className="text-slate-600 dark:text-white/50">{adminUser.status}</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Registro</dt>
                          <dd>{formatDateLong(adminUser.createdAt)}</dd>
                        </div>
                        {adminUser.phone && (
                          <div>
                            <a
                              href={`https://wa.me/${waDigits(adminUser.phone)}?text=${encodeURIComponent(
                                `Hola ${adminUser.fullName}, te contactamos desde el equipo de Strova.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
                            >
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </dl>
                    )}
                  </section>

                  <section>
                    <h3 className="text-slate-500 dark:text-white/50 text-xs uppercase tracking-wider mb-2">
                      Suscripción actual
                    </h3>
                    {!detailSub ? (
                      <p className="text-slate-600 dark:text-white/50">
                        Esta organización no tiene suscripción activa
                      </p>
                    ) : (
                      <dl className="space-y-2 text-slate-800 dark:text-white/90">
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Plan</dt>
                          <dd>
                            <PlanNameBadge displayName={detailSub.plan.displayName} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Ciclo</dt>
                          <dd>{detailSub.billingCycle === 'annual' ? 'Anual' : 'Mensual'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Estado</dt>
                          <dd>
                            <SubscriptionStatusBadge sub={detailSub} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Inicio</dt>
                          <dd>{formatDateShort(detailSub.startDate)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-white/40 text-xs">Vencimiento</dt>
                          <dd>{formatDateShort(detailSub.endDate)}</dd>
                        </div>
                        {detailSub.status === 'active' && (
                          <div>
                            <dt className="text-slate-500 dark:text-white/40 text-xs">Días restantes</dt>
                            <dd>{detailSub.daysRemaining}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </section>

                  <section>
                    <h3 className="text-slate-500 dark:text-white/50 text-xs uppercase tracking-wider mb-2">
                      Ubicaciones
                    </h3>
                    {detailOrg.locations.length === 0 ? (
                      <p className="text-slate-600 dark:text-white/50">Sin ubicaciones registradas</p>
                    ) : (
                      <ul className="space-y-4">
                        {detailOrg.locations.map((loc) => (
                          <li
                            key={loc.id}
                            className="rounded-lg border border-slate-200 dark:border-white/[0.08] p-3 space-y-2"
                          >
                            <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                              {loc.businessCategory?.icon && (
                                <span className="text-lg" aria-hidden>
                                  {loc.businessCategory.icon}
                                </span>
                              )}
                              <span>{loc.name}</span>
                              {loc.businessCategory?.name && (
                                <span className="text-xs font-normal text-slate-500 dark:text-white/40">
                                  ({loc.businessCategory.name})
                                </span>
                              )}
                            </div>
                            {loc.description && (
                              <p className="text-xs text-slate-600 dark:text-white/50">{loc.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {loc.isVerified && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                  Verificada
                                </span>
                              )}
                              {loc.isOpenNow && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400">
                                  Abierto ahora
                                </span>
                              )}
                              {loc.offersDelivery && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-400">
                                  Delivery
                                </span>
                              )}
                              {loc.offersPickup && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                  Pickup
                                </span>
                              )}
                            </div>
                            {(loc.province || loc.municipality || loc.street) && (
                              <p className="text-xs text-slate-600 dark:text-white/50">
                                {[loc.province, loc.municipality, loc.street].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {loc.whatsAppContact && (
                              <a
                                href={`https://wa.me/${waDigits(loc.whatsAppContact)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400"
                              >
                                {loc.whatsAppContact}
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="text-slate-500 dark:text-white/50 text-xs uppercase tracking-wider mb-2">
                      Historial de solicitudes
                    </h3>
                    {historyForOrg(detailOrg.id).length === 0 ? (
                      <p className="text-slate-600 dark:text-white/50">Sin solicitudes registradas</p>
                    ) : (
                      <ul className="space-y-3">
                        {historyForOrg(detailOrg.id).map((req) => {
                          const raw = req.raw
                          const typeRaw = String(raw.type ?? raw.Type ?? '')
                          const notes = raw.notes ?? raw.Notes
                          return (
                            <li
                              key={req.id}
                              className="rounded-lg border border-slate-200 dark:border-white/[0.08] p-3 text-xs"
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-medium text-slate-800 dark:text-white/90">
                                  {requestTypeLabel(typeRaw)}
                                </span>
                                <RequestStatusBadge status={req.status} />
                                <span className="text-slate-500 dark:text-white/40">
                                  {formatDateShort(req.createdAt)}
                                </span>
                              </div>
                              {notes != null && String(notes).trim() !== '' && (
                                <p className="text-slate-600 dark:text-white/50 mt-1">{String(notes)}</p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
