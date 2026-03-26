'use client'

import { useState, useMemo, useEffect } from 'react'
import { Subscription, SubscriptionStatus } from '@/lib/types'
import { StatusBadge, PlanBadge, formatDate, daysUntil } from './Badges'
import { RowActions } from './RowActions'

type Tab = 'all' | SubscriptionStatus
type ExpirationFilter = 'all' | 'expiring-soon' | 'expired'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',       label: 'Todas' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'active',    label: 'Activas' },
  { key: 'expired',   label: 'Vencidas' },
  { key: 'cancelled', label: 'Canceladas' },
]

const EXPIRATION_FILTERS: { key: ExpirationFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'expiring-soon', label: 'Vencen pronto' },
  { key: 'expired', label: 'Vencidos' },
]

const shell =
  'bg-white dark:bg-[#111827] rounded-xl border border-slate-200 shadow-sm dark:border-white/[0.06] dark:shadow-none overflow-hidden'

export function SubscriptionsTable({
  initial,
  onRemoteUpdate,
}: {
  initial: Subscription[]
  /** Tras aprobar/renovar/cambiar plan vía API */
  onRemoteUpdate?: () => void | Promise<void>
}) {
  const [data, setData] = useState(initial)
  useEffect(() => {
    setData(initial)
  }, [initial])

  const [tab, setTab] = useState<Tab>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>('all')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => ({
    all: data.length,
    pending:   data.filter((s) => s.status === 'pending').length,
    active:    data.filter((s) => s.status === 'active').length,
    expired:   data.filter((s) => s.status === 'expired').length,
    cancelled: data.filter((s) => s.status === 'cancelled').length,
  }), [data])

  /** Planes únicos presentes en los datos actuales */
  const planOptions = useMemo(() => {
    const seen = new Map<string, string>()
    data.forEach((s) => {
      const key = s.planId ?? s.plan
      if (!key) return
      const label = s.planName || s.plan
      seen.set(key, label)
    })
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }))
  }, [data])

  const filtered = useMemo(() =>
    data.filter((s) => {
      if (tab !== 'all' && s.status !== tab) return false
      if (planFilter !== 'all') {
        const key = s.planId ?? s.plan
        if (key !== planFilter) return false
      }
      if (expirationFilter !== 'all') {
        const days = daysUntil(s.expiresAt)
        if (expirationFilter === 'expiring-soon' && (days === null || days > 7 || days < 0)) return false
        if (expirationFilter === 'expired' && (days === null || days >= 0)) return false
      }
      if (search && !s.businessName.toLowerCase().includes(search.toLowerCase()) &&
          !s.contactEmail.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
  [data, tab, planFilter, expirationFilter, search])

  return (
    <div className={shell}>
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.06] space-y-3">
        {/* Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-white/30 dark:hover:text-white/60 dark:hover:bg-white/[0.04]'
                }`}
              >
                {t.label}
                <span
                  className={`ml-1.5 tabular-nums ${
                    tab === t.key ? 'text-slate-600 dark:text-white/40' : 'text-slate-400 dark:text-white/20'
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar negocio o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 w-52 transition-colors dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/70 dark:placeholder-white/20"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-white/30">Filtros:</span>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors cursor-pointer dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/70"
          >
            <option value="all" className="bg-white dark:bg-[#111827]">Todos los planes</option>
            {planOptions.map((f) => (
              <option key={f.key} value={f.key} className="bg-white dark:bg-[#111827]">
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={expirationFilter}
            onChange={(e) => setExpirationFilter(e.target.value as ExpirationFilter)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors cursor-pointer dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/70"
          >
            {EXPIRATION_FILTERS.map((f) => (
              <option key={f.key} value={f.key} className="bg-white dark:bg-[#111827]">
                {f.label}
              </option>
            ))}
          </select>

          {(planFilter !== 'all' || expirationFilter !== 'all') && (
            <button
              onClick={() => {
                setPlanFilter('all')
                setExpirationFilter('all')
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/50 dark:hover:text-white/70 dark:hover:bg-white/[0.06]"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.04]">
              {['Negocio', 'Plan', 'Estado', 'Vencimiento', 'Acciones'].map((h) => (
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-sm text-slate-400 dark:text-white/20">
                  No hay resultados
                </td>
              </tr>
            ) : (
              filtered.map((sub, i) => {
                const days = daysUntil(sub.expiresAt)
                const soonExpiring = days !== null && days <= 7 && days > 0
                return (
                  <tr
                    key={sub.id}
                    className={`border-b border-slate-200 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
                      i === filtered.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    {/* Negocio */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-sm text-slate-800 dark:text-white/80">{sub.businessName}</div>
                      <div className="text-xs text-slate-500 dark:text-white/30 mt-0.5">{sub.contactEmail}</div>
                      <div className="text-xs text-slate-400 dark:text-white/20 mt-0.5">{sub.contactPhone}</div>
                      {sub.notes && (
                        <div className="text-xs text-amber-400/70 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate max-w-[180px]">{sub.notes}</span>
                        </div>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3.5">
                      <PlanBadge plan={sub.plan} planLabel={sub.planName} amount={sub.amount} />
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>

                    {/* Vencimiento */}
                    <td className="px-4 py-3.5">
                      <div
                        className={`text-xs font-medium ${
                          soonExpiring ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-white/50'
                        }`}
                      >
                        {formatDate(sub.expiresAt)}
                      </div>
                      {days !== null && (
                        <div
                          className={`text-xs mt-0.5 ${
                            days <= 0
                              ? 'text-red-600 dark:text-red-400'
                              : soonExpiring
                                ? 'text-amber-600/90 dark:text-amber-400/70'
                                : 'text-slate-400 dark:text-white/20'
                          }`}
                        >
                          {days <= 0 ? 'Vencida' : days === 1 ? 'Vence mañana' : `${days} días`}
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3.5">
                      <RowActions sub={sub} onRemoteUpdate={onRemoteUpdate} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.04]">
          <span className="text-xs text-slate-400 dark:text-white/20">
            {filtered.length} {filtered.length === 1 ? 'suscripción' : 'suscripciones'}
            {(tab !== 'all' || search) && ` · ${data.length} en total`}
          </span>
        </div>
      )}
    </div>
  )
}
