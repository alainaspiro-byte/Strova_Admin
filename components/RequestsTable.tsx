'use client'

import { useState } from 'react'
import type { SubscriptionRequestRow } from '@/lib/mappers'
import { apiClient, errorMessage } from '@/lib/api'
import { formatDate } from './Badges'

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
  const [modal, setModal] = useState<'none' | 'approve' | 'reject'>( 'none')
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
    <div className="bg-[#111827] rounded-xl border border-white/[0.06] overflow-hidden">
      {err && (
        <div className="px-4 py-2 text-xs text-red-400 border-b border-white/[0.06]">{err}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {['Negocio', 'Email', 'Plan', 'Estado', 'Alta', 'Acciones'].map((h) => (
                <th
                  key={h}
                  className="text-left text-[10px] font-semibold text-white/20 uppercase tracking-widest px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-sm text-white/20">
                  No hay solicitudes
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${
                    i === rows.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-white/80">{r.businessName}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{r.contactEmail}</td>
                  <td className="px-4 py-3 text-xs text-white/50">{r.planLabel}</td>
                  <td className="px-4 py-3 text-xs text-amber-400/90">{r.status || '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/30">{r.createdAt ? formatDate(r.createdAt) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal === 'approve' && activeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="bg-[#1a2332] border border-white/[0.08] rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Aprobar solicitud</h3>
            <input
              placeholder="Referencia de pago (opcional)"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white"
            />
            <textarea
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white min-h-[60px]"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-xs text-white/50">
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
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 text-emerald-400"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'reject' && activeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="bg-[#1a2332] border border-white/[0.08] rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Rechazar solicitud</h3>
            <textarea
              placeholder="Motivo (obligatorio)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white min-h-[72px]"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={close} className="px-3 py-1.5 text-xs text-white/50">
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
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
