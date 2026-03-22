'use client'

import { useState } from 'react'
import { Subscription } from '@/lib/types'
import { PLAN_LABELS, WHATSAPP_NUMBER } from '@/lib/data'

function buildWaUrl(sub: Subscription) {
  const plan = PLAN_LABELS[sub.plan]
  const msg =
    sub.status === 'pending'
      ? `Hola ${sub.businessName}, te contactamos desde Strova.\n\nTu solicitud del plan ${plan} ($${sub.amount}/mes) está lista. ¿Cómo prefieres pagar: efectivo o transferencia?`
      : `Hola ${sub.businessName}, tu plan ${plan} en Strova vence pronto. ¿Deseas renovar por $${sub.amount} más?`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

interface Props {
  sub: Subscription
  onChange: (id: string, status: Subscription['status'], method?: Subscription['paymentMethod']) => void
}

export function RowActions({ sub, onChange }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash')

  return (
    <div className="flex items-center gap-1.5">
      {/* WhatsApp */}
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

      {/* Confirmar pago (pendientes) */}
      {sub.status === 'pending' && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          Confirmar
        </button>
      )}

      {sub.status === 'pending' && confirming && (
        <div className="flex items-center gap-1">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'cash' | 'transfer')}
            className="text-xs bg-slate-800 border border-white/10 rounded-md px-1.5 py-1 text-white/70 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
          </select>
          <button
            onClick={() => { onChange(sub.id, 'active', method); setConfirming(false) }}
            className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center text-xs transition-colors"
          >✓</button>
          <button
            onClick={() => setConfirming(false)}
            className="w-6 h-6 rounded-md bg-white/5 text-white/30 hover:bg-white/10 flex items-center justify-center text-xs transition-colors"
          >✕</button>
        </div>
      )}

      {/* Cancelar (activas) */}
      {sub.status === 'active' && (
        <button
          onClick={() => onChange(sub.id, 'cancelled')}
          title="Cancelar suscripción"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Reactivar vencidas */}
      {(sub.status === 'expired' || sub.status === 'cancelled') && (
        <button
          onClick={() => onChange(sub.id, 'pending')}
          title="Marcar como pendiente"
          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50 transition-colors"
        >
          Reactivar
        </button>
      )}
    </div>
  )
}
