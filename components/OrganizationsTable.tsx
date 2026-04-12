'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient, errorMessage, isApiError } from '@/lib/api'
import type { ApiSubscription } from '@/lib/subscriptionApiTypes'
import type { ApiUserDetail, OrganizationEntity } from '@/lib/organizationApiTypes'
import type { SubscriptionRequestRow } from '@/lib/mappers'
import { readWhatsAppTemplates } from '@/app/actions/whatsapp-templates'
import {
  applyWhatsappTemplateBodyForOrganizationDetail,
  type WhatsAppMessageTemplate,
} from '@/lib/whatsapp-templates'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

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

function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (parts.length === 1 && parts[0].length === 1) {
    return `${parts[0][0].toUpperCase()}•`
  }
  return '—'
}

/** Porcentaje del periodo startDate→endDate ya transcurrido (0–100). */
function subscriptionElapsedPercent(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  const totalMs = end - start
  const elapsedMs = now - start
  if (elapsedMs <= 0) return 0
  if (elapsedMs >= totalMs) return 100
  return Math.round((elapsedMs / totalMs) * 100)
}

/** Si la suscripción prioritaria no trae adminContact, reutiliza el de otra suscripción de la misma org. */
function withAdminFromSiblings(primary: ApiSubscription, subs: ApiSubscription[]): ApiSubscription {
  const uid = primary.adminContact?.userId ?? 0
  if (uid > 0) return primary
  for (const s of subs) {
    const a = s.adminContact
    if (a && (a.userId ?? 0) > 0) {
      return { ...primary, adminContact: a }
    }
  }
  return primary
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
    const primary = subs[0]
    map.set(oid, withAdminFromSiblings(primary, subs))
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
  const [adminError, setAdminError] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState<
    { kind: 'verify' | 'unverify'; orgId: number } | null
  >(null)
  const [verifyBusy, setVerifyBusy] = useState(false)

  const [waTplOpen, setWaTplOpen] = useState(false)
  const [waTplList, setWaTplList] = useState<WhatsAppMessageTemplate[]>([])
  const [waTplLoading, setWaTplLoading] = useState(false)
  const [waTplErr, setWaTplErr] = useState<string | null>(null)
  const [waTplSelected, setWaTplSelected] = useState<WhatsAppMessageTemplate | null>(null)

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

  useEffect(() => {
    setWaTplOpen(false)
    setWaTplSelected(null)
    setWaTplErr(null)
    setWaTplList([])
  }, [detailOrgId])

  const openWaTemplatePicker = useCallback(() => {
    setWaTplOpen(true)
    setWaTplSelected(null)
    setWaTplErr(null)
    setWaTplLoading(true)
    readWhatsAppTemplates()
      .then((list) => {
        setWaTplList(list)
      })
      .catch((e) => {
        setWaTplErr(e instanceof Error ? e.message : 'No se pudieron cargar las plantillas')
        setWaTplList([])
      })
      .finally(() => setWaTplLoading(false))
  }, [])

  const detailOrg = useMemo(() => {
    if (detailOrgId == null) return null
    return organizations.find((o) => o.id === detailOrgId) ?? null
  }, [detailOrgId, organizations])

  const detailSub = detailOrg ? subscriptionMap.get(detailOrg.id) ?? null : null

  useEffect(() => {
    if (detailOrgId == null) {
      setAdminUser(null)
      setAdminLoading(false)
      setAdminError(null)
      return
    }
    const sub = subscriptionMap.get(detailOrgId)
    const uid = sub?.adminContact?.userId ?? 0
    if (uid <= 0) {
      setAdminUser(null)
      setAdminLoading(false)
      setAdminError(null)
      return
    }
    let cancelled = false
    setAdminLoading(true)
    setAdminUser(null)
    setAdminError(null)
    apiClient
      .getUserById(uid)
      .then((u) => {
        if (!cancelled) {
          const bad = u.id === 0 && !u.email?.trim() && u.fullName === '—'
          if (bad) {
            setAdminUser(null)
            setAdminError('Respuesta de usuario vacía o no reconocida.')
          } else {
            setAdminUser(u)
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setAdminUser(null)
          setAdminError(errorMessage(e, 'No se pudo cargar el usuario'))
        }
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
          <table className="w-full min-w-[840px]">
            <thead className="bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06]">
              <tr>
                {[
                  'Organización',
                  'Admin',
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
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500 dark:text-white/40 text-sm"
                  >
                    No hay organizaciones que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                pageSlice.map((org) => {
                  const sub = subscriptionMap.get(org.id) ?? null
                  const admin = sub?.adminContact

                  return (
                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-[#111827]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">{org.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-white/35 font-mono">{org.code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">
                        {admin?.fullName ?? '—'}
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
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-detail-title"
          onClick={() => {
            setWaTplOpen(false)
            setDetailOrgId(null)
          }}
        >
          <div
            className="flex w-full max-w-[520px] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#1a2332] dark:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            {!detailOrg ? (
              <div className="p-6 text-sm text-slate-500 dark:text-white/40">Organización no encontrada.</div>
            ) : (
              <>
                <header className="flex items-start gap-3 border-b border-slate-200 px-4 pb-3 pt-4 dark:border-white/[0.06]">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-white/85"
                    aria-hidden
                  >
                    {orgInitials(detailOrg.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id="org-detail-title" className="text-base font-bold text-slate-900 dark:text-white">
                        {detailOrg.name}
                      </h2>
                      <OrgVerificationBadge verified={detailOrg.isVerified} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-white/40">
                      <span className="font-mono">{detailOrg.code}</span>
                      <span className="text-slate-400 dark:text-white/25"> · </span>
                      {detailOrg.locations.length === 0
                        ? 'Sin ubicaciones'
                        : detailOrg.locations.length === 1
                          ? '1 ubicación'
                          : `${detailOrg.locations.length} ubicaciones`}
                    </p>
                    <p className="mt-1.5 text-xs leading-snug text-slate-600 dark:text-white/50">
                      {detailOrg.description ?? 'Sin descripción'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
                      Alta: {formatDateLong(detailOrg.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWaTplOpen(false)
                      setDetailOrgId(null)
                    }}
                    className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    aria-label="Cerrar"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <section className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#111827]">
                      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
                        Admin
                      </h3>
                      {!detailSub?.adminContact ? (
                        <p className="text-slate-600 dark:text-white/50">Sin admin registrado</p>
                      ) : adminLoading ? (
                        <p className="text-slate-500 dark:text-white/40">Cargando datos del admin…</p>
                      ) : !adminUser ? (
                        <p className="text-sm text-amber-600 dark:text-amber-400/90">
                          {adminError ?? 'No se pudieron cargar los datos del usuario.'}
                        </p>
                      ) : (
                        <dl className="space-y-2 text-slate-800 dark:text-white/90">
                          <div>
                            <dt className="text-xs text-slate-500 dark:text-white/40">Nombre</dt>
                            <dd>{adminUser.fullName}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500 dark:text-white/40">Email</dt>
                            <dd>{adminUser.email || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500 dark:text-white/40">Estado</dt>
                            <dd>
                              {adminUser.status === 0 ? (
                                <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                                  Activo
                                </span>
                              ) : (
                                <span className="text-slate-600 dark:text-white/50">{adminUser.status}</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </section>

                    <section className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#111827]">
                      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
                        Suscripción actual
                      </h3>
                      {!detailSub ? (
                        <p className="text-slate-600 dark:text-white/50">
                          Esta organización no tiene suscripción activa
                        </p>
                      ) : (
                        <>
                          <dl className="space-y-2 text-slate-800 dark:text-white/90">
                            <div>
                              <dt className="text-xs text-slate-500 dark:text-white/40">Plan</dt>
                              <dd>
                                <PlanNameBadge displayName={detailSub.plan.displayName} />
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-slate-500 dark:text-white/40">Ciclo</dt>
                              <dd>{detailSub.billingCycle === 'annual' ? 'Anual' : 'Mensual'}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-slate-500 dark:text-white/40">Estado</dt>
                              <dd>
                                <SubscriptionStatusBadge sub={detailSub} />
                              </dd>
                            </div>
                            {detailSub.status !== 'active' && (
                              <>
                                <div>
                                  <dt className="text-xs text-slate-500 dark:text-white/40">Inicio</dt>
                                  <dd>{formatDateShort(detailSub.startDate)}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs text-slate-500 dark:text-white/40">Vencimiento</dt>
                                  <dd>{formatDateShort(detailSub.endDate)}</dd>
                                </div>
                              </>
                            )}
                          </dl>
                          {detailSub.status === 'active' && detailSub.startDate && detailSub.endDate && (
                            <div className="mt-3">
                              <div className="h-1.5 min-h-[6px] w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                <div
                                  className="h-full min-h-[6px] rounded-full bg-emerald-500 dark:bg-emerald-400"
                                  style={{
                                    width: `${subscriptionElapsedPercent(detailSub.startDate, detailSub.endDate)}%`,
                                  }}
                                />
                              </div>
                              <div className="mt-1.5 flex items-start justify-between gap-2 text-[10px] leading-tight text-slate-500 dark:text-white/40">
                                <span>{formatDateShort(detailSub.startDate)}</span>
                                <span className="shrink-0 text-right">
                                  {detailSub.daysRemaining} días restantes
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  </div>

                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#111827]">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
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

                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-[#111827]">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
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
                </div>

                <footer className="flex flex-wrap justify-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/[0.06]">
                  {detailSub?.adminContact?.phone && waDigits(detailSub.adminContact.phone) ? (
                    <button
                      type="button"
                      onClick={openWaTemplatePicker}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </button>
                  ) : null}
                  {!detailOrg.isVerified ? (
                    <button
                      type="button"
                      disabled={verifyBusy}
                      onClick={() => setConfirmModal({ kind: 'verify', orgId: detailOrg.id })}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 dark:bg-blue-500"
                    >
                      Verificar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={verifyBusy}
                      onClick={() => setConfirmModal({ kind: 'unverify', orgId: detailOrg.id })}
                      className="rounded-lg border border-amber-500 bg-transparent px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-500/10 disabled:opacity-50 dark:border-amber-500/60 dark:text-amber-400"
                    >
                      Quitar verificación
                    </button>
                  )}
                </footer>
              </>
            )}
          </div>
        </div>
      )}

      {waTplOpen &&
        detailOrg &&
        detailSub?.adminContact?.phone &&
        waDigits(detailSub.adminContact.phone) && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-tpl-title"
            onClick={() => setWaTplOpen(false)}
          >
            <div
              className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/[0.08] dark:bg-[#1a2332] dark:shadow-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 id="wa-tpl-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Plantillas de WhatsApp
                </h2>
                <button
                  type="button"
                  onClick={() => setWaTplOpen(false)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {waTplLoading ? (
                <p className="text-sm text-slate-500 dark:text-white/45">Cargando plantillas…</p>
              ) : waTplErr ? (
                <p className="text-sm text-red-600 dark:text-red-400">{waTplErr}</p>
              ) : waTplSelected ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setWaTplSelected(null)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    ← Elegir otra plantilla
                  </button>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/45">
                      Vista previa
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-white/90">
                      {applyWhatsappTemplateBodyForOrganizationDetail(waTplSelected.body, detailSub)}
                    </p>
                  </div>
                  <a
                    href={buildWhatsAppUrl(
                      waDigits(detailSub.adminContact.phone),
                      applyWhatsappTemplateBodyForOrganizationDetail(waTplSelected.body, detailSub)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                  >
                    Abrir WhatsApp
                  </a>
                </div>
              ) : waTplList.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-white/45">
                  No hay plantillas. Añádelas en Configuración → Plantillas de WhatsApp.
                </p>
              ) : (
                <ul className="space-y-2">
                  {waTplList.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setWaTplSelected(t)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#111827] dark:hover:bg-white/[0.06]"
                      >
                        <span className="block font-medium text-slate-900 dark:text-white">{t.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-white/45">
                          {t.description || '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
    </div>
  )
}
