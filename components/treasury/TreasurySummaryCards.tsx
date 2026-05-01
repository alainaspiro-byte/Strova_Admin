'use client'

import { TreasurySummary } from '@/lib/treasuryTypes'
import { formatCup } from '@/lib/treasuryFormat'

interface TreasurySummaryCardsProps {
  summary?: TreasurySummary
  isLoading: boolean
  /** Etiqueta del periodo seleccionado, p.ej. "Mayo 2026". */
  periodLabel: string
}

interface CardConfig {
  key: string
  label: string
  value: string
  sub: string
  /** Color del valor y del icono. */
  color: string
  /** Fondo + borde del card en ambos temas. */
  bg: string
  icon: JSX.Element
}

function buildCards(summary: TreasurySummary, periodLabel: string): CardConfig[] {
  const monthNetPositive = summary.monthNet >= 0
  const totalNetPositive = summary.totalNet >= 0

  return [
    {
      key: 'income',
      label: 'Ingresos del mes',
      value: formatCup(summary.monthIncome),
      sub: periodLabel,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 border-emerald-200/80 dark:bg-emerald-500/10 dark:border-emerald-500/20',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      key: 'expense',
      label: 'Egresos del mes',
      value: formatCup(summary.monthExpense),
      sub: periodLabel,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 border-rose-200/80 dark:bg-rose-500/10 dark:border-rose-500/20',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.511l-5.511-3.181" />
        </svg>
      ),
    },
    {
      key: 'monthNet',
      label: 'Balance neto mensual',
      value: formatCup(summary.monthNet),
      sub: monthNetPositive ? 'Mes en positivo' : 'Mes en negativo',
      color: monthNetPositive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-amber-600 dark:text-amber-400',
      bg: monthNetPositive
        ? 'bg-blue-50 border-blue-200/80 dark:bg-blue-500/10 dark:border-blue-500/20'
        : 'bg-amber-50 border-amber-200/80 dark:bg-amber-500/10 dark:border-amber-500/20',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      key: 'totalNet',
      label: 'Balance acumulado',
      value: formatCup(summary.totalNet),
      sub: totalNetPositive ? 'Historico positivo' : 'Historico negativo',
      color: totalNetPositive
        ? 'text-violet-600 dark:text-violet-400'
        : 'text-amber-600 dark:text-amber-400',
      bg: totalNetPositive
        ? 'bg-violet-50 border-violet-200/80 dark:bg-violet-500/10 dark:border-violet-500/20'
        : 'bg-amber-50 border-amber-200/80 dark:bg-amber-500/10 dark:border-amber-500/20',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
    },
  ]
}

const SKELETON_CARDS = ['income', 'expense', 'monthNet', 'totalNet']

export function TreasurySummaryCards({ summary, isLoading, periodLabel }: TreasurySummaryCardsProps) {
  if (!summary || isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {SKELETON_CARDS.map((key) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-[#111827] dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-white/[0.06]" />
            </div>
            <div className="space-y-2">
              <div className="h-7 w-28 animate-pulse rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const cards = buildCards(summary, periodLabel)

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm dark:shadow-none ${c.bg}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-white/40">{c.label}</span>
            <span className={c.color}>{c.icon}</span>
          </div>
          <div>
            <div className={`text-2xl font-semibold tabular-nums ${c.color}`}>{c.value}</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-white/30">{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
