'use client'

import { SubscriptionStats } from '@/lib/types'

const cards = (stats: SubscriptionStats) => [
  {
    label: 'Activas',
    value: stats.active,
    sub: 'suscripciones al día',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-400',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Pendientes',
    value: stats.pending,
    sub: 'esperando confirmación',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-400',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Ingresos del mes',
    value: `$${stats.monthlyRevenue}`,
    sub: `de ${stats.active} clientes activos`,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-400',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Vencen esta semana',
    value: stats.expiringThisWeek,
    sub: 'requieren seguimiento',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    dot: 'bg-red-400',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
]

export function StatsCards({ stats }: { stats: SubscriptionStats }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards(stats).map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border p-4 flex flex-col gap-3 ${c.bg}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-medium">{c.label}</span>
            <span className={c.color}>{c.icon}</span>
          </div>
          <div>
            <div className={`text-2xl font-semibold tabular-nums ${c.color}`}>{c.value}</div>
            <div className="text-xs text-white/30 mt-0.5">{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
