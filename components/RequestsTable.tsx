'use client'

import { useState, useMemo } from 'react'
import type { SubscriptionRequestRow } from '@/lib/mappers'
import { apiClient, errorMessage } from '@/lib/api'
import { formatDate } from './Badges'

const shell =
  'bg-white dark:bg-[#111827] rounded-xl border border-slate-200 shadow-sm dark:border-white/[0.06] dark:shadow-none overflow-hidden'
const modalPanel =
  'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 w-full max-w-sm space-y-3 shadow-xl dark:shadow-none'
const field =
  'w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',      label: 'Todas' },
  { key: 'pending',  label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
]

function statusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === 'pending')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400">Pendiente</span>
  if (s === 'approved' || s === 'active')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">Aprobada</span>
  if (s === 'rejected' || s === 'cancelled')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400">Rechazada</span>
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/15 text-slate-400">{status || '—'}</span>
}

export function RequestsTable({
  initial,
  onRemoteUpdate,
}: {
  initial: SubscriptionRequestRow[]
  onRemoteUpdate?: () => void | Promise<void>
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modal, setModal] = useState<'none' | 'approve' | 'reject'>('none')
  const [activeRow, setActiveRow] = useState<SubscriptionRequestRow | null>(null)
  const [notes, setNotes] = useState('')
  const [paymentRef, setPaymentRef] = useState('')

  const close = () => {
    setModal('none')
    setActiveRow(null)
    setNotes('')
    setPaymentRef('')
    setErr(null)
  }

  const run = async (fn: () => Promise<void>) => {
    if (!activeRow) return
    setBusyId(activeRow.id)
    setErr(null)
    try {
      await fn()
      await onRemoteUpdate?.()
      close()
    } catch (e) {
      setErr(errorMessage(e, 'Error'))
    } finally {
      setBusyId(null)
    }
  }

  // Counts por estado para los tabs
  const counts = useMemo(() => ({
    all:      initial.length,
    pending:  initial.filter((r) => r.status.toLowerCase() === 'pending').length,
    approved: initial.filter((r) => ['approved', 'active'].includes(r.status.toLowerCase())).length,
    rejected: initial.filter((r) => ['rejected', 'cancelled'].includes(r.status.toLowerCase())).length,
  }), [initial])

  const filtered = useMemo(() => {
    return initial.filter((r) => {
      const s = r.status.toLowerCase()
      if (statusFilter === 'pending'  && s !== 'pending') return false
      if (statusFilter === 'approved' && !['approved', 'active'].includes(s)) return false
      if (statusFilter === 'rejected' && !['rejected', 'cancelled'].includes(s)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.businessName.toLowerCase().includes(q) ||
          r.contactEmail.toLowerCase().includes(q) ||
          r.planLabel.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [initial, statusFilter, search])

  // Solo se puede aprobar/rechazar si la solicitud está pendiente
  const canAct = (r: SubscriptionRequestRow) => r.status.toLowerCase() === 'pending'

  return (
    <div className={shell}>
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Tabs de estado */}
          <div className="flex gap-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.key
                    ? 'bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-white/30 dark:hover:text-white/60 dark:hover:bg-white/[0.04]'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 tabular-nums ${statusFilter === f.key ? 'text-slate-600 dark:text-white/40' : 'text-slate-400 dark:text-white/20'}`}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar negocio, email o plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500/50 w-52 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/70 dark:placeholder-white/20"
            />
          </div>
        </div>
      </div>

      {err && (
        <div className="px-4 py-2 text-xs text-red-600 dark:text-red-400 border-b border-slate-200 dark:border-white/[0.06] bg-red-50 dark:bg-red-500/5">
          ⚠️ {err}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.04]">
              {['Negocio', 'Email', 'Plan', 'Estado', 'Fecha', 'Acciones'].map((h) => (
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
                <td colSpan={6} className="text-center py-16 text-sm text-slate-400 dark:text-white/20">
                  {statusFilter === 'pending' ? 'No hay solicitudes pendientes 🎉' : 'No hay resultados'}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-200 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                    i === filtered.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-white/80 font-medium">{r.businessName}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/40">{r.contactEmail}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-white/50">{r.planLabel}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/30">
                    {r.createdAt ? formatDate(r.createdAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {canAct(r) ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => { setActiveRow(r); setModal('approve') }}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-40"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => { setActiveRow(r); setModal('reject') }}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-40"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-white/20 italic">Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.04]">
          <span className="text-xs text-slate-400 dark:text-white/20">
            {filtered.length} {filtered.length === 1 ? 'solicitud' : 'solicitudes'}
            {statusFilter !== 'all' && ` · ${initial.length} en total`}
          </span>
        </div>
      )}

      {/* Modal Aprobar */}
      {modal === 'approve' && activeRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Aprobar solicitud
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              {activeRow.businessName} · {activeRow.planLabel}
            </p>
            <input
              placeholder="Referencia de pago (opcional)"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className={field}
            />
            <textarea
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[60px]`}
            />
            {err && <p className="text-[11px] text-red-400">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() =>
                  run(async () => {
                    await apiClient.approveRequest(activeRow.id, {
                      notes: notes || undefined,
                      paymentReference: paymentRef || undefined,
                    })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
              >
                {busyId ? '…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {modal === 'reject' && activeRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Rechazar solicitud
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              {activeRow.businessName} · {activeRow.planLabel}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              El motivo es obligatorio según la API.
            </p>
            <textarea
              placeholder="Motivo (obligatorio)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[72px]`}
            />
            {err && <p className="text-[11px] text-red-400">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId !== null || !notes.trim()}
                onClick={() =>
                  run(async () => {
                    await apiClient.rejectRequest(activeRow.id, { notes: notes.trim() })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 disabled:opacity-50"
              >
                {busyId ? '…' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}