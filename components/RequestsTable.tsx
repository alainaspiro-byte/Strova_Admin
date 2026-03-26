'use client'

import { useState } from 'react'
import type { SubscriptionRequestRow } from '@/lib/mappers'
import { apiClient, errorMessage } from '@/lib/api'
import { formatDate } from './Badges'

const shell =
  'bg-white dark:bg-[#111827] rounded-xl border border-slate-200 shadow-sm dark:border-white/[0.06] dark:shadow-none overflow-hidden'
const modalPanel =
  'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 w-full max-w-sm space-y-3 shadow-xl dark:shadow-none'
const field =
  'w-full px-3 py-2 text-xs bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white'

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function buildRequestWaUrl(r: SubscriptionRequestRow): { url: string; hasPhone: boolean } {
  const phone = sanitizePhone(r.contactPhone || '')
  if (!phone) return { url: '#', hasPhone: false }
  const msg = `Hola ${r.businessName}, te contactamos desde Strova.\n\nTu solicitud del plan ${r.planLabel} está lista. ¿Cómo prefieres pagar: efectivo o transferencia?`
  return {
    url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
    hasPhone: true,
  }
}

export function RequestsTable({
  initial,
  onRemoteUpdate,
}: {
  initial: SubscriptionRequestRow[]
  onRemoteUpdate?: () => void | Promise<void>
}) {
  const rows = initial
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modal, setModal] = useState<'none' | 'approve' | 'reject'>('none')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [paymentRef, setPaymentRef] = useState('')

  const close = () => {
    setModal('none')
    setActiveId(null)
    setNotes('')
    setPaymentRef('')
    setErr(null)
  }

  const run = async (fn: () => Promise<void>) => {
    setBusyId(activeId)
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

  return (
    <div className={shell}>
      {err && (
        <div className="px-4 py-2 text-xs text-red-600 dark:text-red-400 border-b border-slate-200 dark:border-white/[0.06]">
          {err}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.04]">
              {['Negocio', 'Contacto', 'Plan', 'Estado', 'Alta', 'Acciones'].map((h) => (
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-sm text-slate-400 dark:text-white/20">
                  No hay solicitudes
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const wa = buildRequestWaUrl(r)
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-200 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] ${
                      i === rows.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    {/* Negocio */}
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-white/80">
                      {r.businessName}
                    </td>

                    {/* Contacto */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-500 dark:text-white/40">{r.contactEmail || '—'}</div>
                      {r.contactPhone && (
                        <div className="text-xs text-slate-400 dark:text-white/25 mt-0.5">{r.contactPhone}</div>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-white/50">{r.planLabel}</td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-xs text-amber-700 dark:text-amber-400/90">{r.status || '—'}</td>

                    {/* Alta */}
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/30">
                      {r.createdAt ? formatDate(r.createdAt) : '—'}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* WhatsApp */}
                        <a
                          href={wa.url}
                          target={wa.hasPhone ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          title={
                            wa.hasPhone
                              ? `WhatsApp: ${r.contactPhone}`
                              : 'Sin teléfono registrado'
                          }
                          onClick={!wa.hasPhone ? (e) => e.preventDefault() : undefined}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            wa.hasPhone
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 cursor-not-allowed opacity-40'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>

                        {/* Aprobar */}
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => {
                            setActiveId(r.id)
                            setModal('approve')
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        >
                          Aprobar
                        </button>

                        {/* Rechazar */}
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => {
                            setActiveId(r.id)
                            setModal('reject')
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        >
                          Rechazar
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

      {modal === 'approve' && activeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Aprobar solicitud</h3>
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
            {err && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() =>
                  run(async () => {
                    await apiClient.approveRequest(activeId, {
                      notes: notes || undefined,
                      paymentReference: paymentRef || undefined,
                    })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
              >
                {busyId !== null ? '…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'reject' && activeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className={modalPanel}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Rechazar solicitud</h3>
            <p className="text-[11px] text-slate-500 dark:text-white/40">La API exige un motivo (notas).</p>
            <textarea
              placeholder="Motivo (obligatorio)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${field} min-h-[72px]`}
            />
            {err && <p className="text-xs text-red-400">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId !== null || !notes.trim()}
                onClick={() =>
                  run(async () => {
                    await apiClient.rejectRequest(activeId, { notes: notes.trim() })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 disabled:opacity-50"
              >
                {busyId !== null ? '…' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
