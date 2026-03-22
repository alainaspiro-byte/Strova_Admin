'use client'

import { useState, useCallback } from 'react'
import { Subscription } from '@/lib/types'
import { PLAN_LABELS, WHATSAPP_NUMBER } from '@/lib/data'
import { apiClient, errorMessage, type BillingCycle } from '@/lib/api'
import type { SubscriptionPlan } from '@/lib/types'

const DEFAULT_BILLING: BillingCycle = 'Monthly'

function planDisplay(sub: Subscription) {
  return sub.planName || (sub.plan in PLAN_LABELS ? PLAN_LABELS[sub.plan as keyof typeof PLAN_LABELS] : String(sub.plan))
}

function buildWaUrl(sub: Subscription) {
  const plan = planDisplay(sub)
  const msg =
    sub.status === 'pending'
      ? `Hola ${sub.businessName}, te contactamos desde Strova.\n\nTu solicitud del plan ${plan} ($${sub.amount}/mes) está lista. ¿Cómo prefieres pagar: efectivo o transferencia?`
      : `Hola ${sub.businessName}, tu plan ${plan} en Strova vence pronto. ¿Deseas renovar por $${sub.amount} más?`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

interface Props {
  sub: Subscription
  onChange: (id: string, status: Subscription['status'], method?: Subscription['paymentMethod']) => void
  onRemoteUpdate?: () => void | Promise<void>
}

export function RowActions({ sub, onChange, onRemoteUpdate }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [modal, setModal] = useState<'none' | 'renew' | 'change' | 'approve' | 'reject'>('none')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(DEFAULT_BILLING)
  const [notes, setNotes] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [planId, setPlanId] = useState(sub.planId || '')
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])

  const closeAll = () => {
    setModal('none')
    setErr(null)
    setNotes('')
    setPaymentRef('')
  }

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true)
      setErr(null)
      try {
        await fn()
        await onRemoteUpdate?.()
        closeAll()
      } catch (e) {
        setErr(errorMessage(e, 'Error al contactar la API'))
      } finally {
        setBusy(false)
      }
    },
    [onRemoteUpdate]
  )

  const loadPlansForChange = async () => {
    setModal('change')
    setPlanId(sub.planId || '')
    try {
      const list = await apiClient.getPlansCatalog()
      setPlans(list)
      if (!sub.planId && list.length) setPlanId(list[0].id)
    } catch {
      setPlans([])
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {err && <span className="text-[10px] text-red-400 max-w-[140px] text-right">{err}</span>}

      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <a
          href={buildWaUrl(sub)}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir en WhatsApp"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>

        {sub.status === 'pending' && sub.requestId && (
          <>
            <button
              type="button"
              onClick={() => setModal('approve')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setModal('reject')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
            >
              Rechazar
            </button>
          </>
        )}

        {sub.status === 'pending' && !sub.requestId && (
          <span className="text-[10px] text-white/25 max-w-[100px] text-right">Solicitudes: pestaña aparte</span>
        )}

        {sub.status === 'active' && (
          <button
            type="button"
            onClick={loadPlansForChange}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
          >
            Cambiar plan
          </button>
        )}

        {(sub.status === 'expired' || sub.status === 'cancelled') && (
          <button
            type="button"
            onClick={() => {
              setModal('renew')
              setBillingCycle(DEFAULT_BILLING)
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            Renovar
          </button>
        )}
      </div>

      {modal === 'approve' && sub.requestId && (
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
              <button type="button" onClick={closeAll} className="px-3 py-1.5 text-xs text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await apiClient.approveRequest(sub.requestId!, {
                      notes: notes || undefined,
                      paymentReference: paymentRef || undefined,
                    })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 text-emerald-400"
              >
                {busy ? '…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'reject' && sub.requestId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="bg-[#1a2332] border border-white/[0.08] rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Rechazar solicitud</h3>
            <p className="text-[11px] text-white/40">La API exige un motivo (notas).</p>
            <textarea
              placeholder="Motivo (obligatorio)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white min-h-[72px]"
              required
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeAll} className="px-3 py-1.5 text-xs text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !notes.trim()}
                onClick={() =>
                  run(async () => {
                    await apiClient.rejectRequest(sub.requestId!, { notes: notes.trim() })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400"
              >
                {busy ? '…' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'renew' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="bg-[#1a2332] border border-white/[0.08] rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Renovar suscripción</h3>
            <label className="block text-[11px] text-white/50">Ciclo de facturación</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white"
            >
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
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
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white min-h-[50px]"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeAll} className="px-3 py-1.5 text-xs text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await apiClient.renewSubscription(sub.id, {
                      billingCycle,
                      paymentReference: paymentRef || undefined,
                      notes: notes || undefined,
                    })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 text-emerald-400"
              >
                {busy ? '…' : 'Renovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'change' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="bg-[#1a2332] border border-white/[0.08] rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Cambiar plan</h3>
            <label className="block text-[11px] text-white/50">Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white"
            >
              {plans.length === 0 ? (
                <option value="">Cargando o sin planes…</option>
              ) : (
                plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price})
                  </option>
                ))
              )}
            </select>
            <label className="block text-[11px] text-white/50">Ciclo de facturación</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white"
            >
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
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
              className="w-full px-3 py-2 text-xs bg-[#111827] border border-white/[0.08] rounded-lg text-white min-h-[50px]"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeAll} className="px-3 py-1.5 text-xs text-white/50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !planId}
                onClick={() =>
                  run(async () => {
                    await apiClient.changePlan(sub.id, {
                      planId,
                      billingCycle,
                      paymentReference: paymentRef || undefined,
                      notes: notes || undefined,
                    })
                  })
                }
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 text-blue-400"
              >
                {busy ? '…' : 'Cambiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
