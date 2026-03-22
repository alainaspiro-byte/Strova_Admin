import { Plan, SubscriptionStatus, PaymentMethod } from '@/lib/types'
import { PLAN_LABELS } from '@/lib/data'

const STATUS: Record<SubscriptionStatus, { label: string; classes: string }> = {
  active:    { label: 'Activa',    classes: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25' },
  pending:   { label: 'Pendiente', classes: 'bg-amber-500/15 text-amber-400 ring-amber-500/25' },
  cancelled: { label: 'Cancelada', classes: 'bg-white/5 text-white/30 ring-white/10' },
  expired:   { label: 'Vencida',   classes: 'bg-red-500/15 text-red-400 ring-red-500/25' },
}

const PLAN_STYLE: Record<Plan, string> = {
  basic:      'bg-slate-700/60 text-slate-300',
  pro:        'bg-blue-500/15 text-blue-400',
  enterprise: 'bg-purple-500/15 text-purple-400',
}

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const cfg = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${cfg.classes}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {cfg.label}
    </span>
  )
}

export function PlanBadge({ plan, amount }: { plan: Plan; amount: number }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${PLAN_STYLE[plan]}`}>
      {PLAN_LABELS[plan]} · ${amount}
    </span>
  )
}

export function PaymentBadge({ method }: { method: PaymentMethod }) {
  if (!method) return <span className="text-xs text-white/20">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
      {method === 'cash' ? (
        <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      )}
      {method === 'cash' ? 'Efectivo' : 'Transferencia'}
    </span>
  )
}

export function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
