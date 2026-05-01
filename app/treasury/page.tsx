'use client'

import { useState } from 'react'
import { ExpensesTable } from '@/components/treasury/ExpensesTable'
import { IncomesTable } from '@/components/treasury/IncomesTable'
import { TreasuryPeriodFilter, periodToLabel } from '@/components/treasury/TreasuryPeriodFilter'
import { TreasurySummaryCards } from '@/components/treasury/TreasurySummaryCards'
import { useTreasurySummary } from '@/lib/treasuryHooks'
import { getCurrentPeriod, PeriodFilter } from '@/lib/treasuryTypes'

const MOCK_ON = process.env.NEXT_PUBLIC_TREASURY_MOCK === 'true'

export default function TreasuryPage() {
  const [period, setPeriod] = useState<PeriodFilter>(() => getCurrentPeriod())
  const summaryQuery = useTreasurySummary(period)
  const periodLabel = periodToLabel(period)

  return (
    <div className="space-y-6 p-4 md:space-y-8 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Finanzas internas
            </span>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white/90 md:text-3xl">Tesoreria</h1>
          <p className="text-sm text-slate-500 dark:text-white/40">
            Registro de ingresos y egresos del periodo, balance neto mensual y acumulado historico. Montos en CUP.
          </p>
        </div>
        <TreasuryPeriodFilter value={period} onChange={setPeriod} />
      </div>

      {MOCK_ON && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300/80">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div>
            <span className="font-medium">Modo mock activo.</span>{' '}
            Los datos se guardan en este navegador (localStorage) y se pierden al limpiar la cache.
            Cuando el backend tenga los endpoints de tesoreria, cambia <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px] dark:bg-amber-500/10">NEXT_PUBLIC_TREASURY_MOCK</code> a <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px] dark:bg-amber-500/10">false</code>.
          </div>
        </div>
      )}

      {summaryQuery.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          No se pudo cargar el resumen: {String(summaryQuery.error?.message ?? summaryQuery.error)}
        </div>
      )}

      <TreasurySummaryCards
        summary={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
        periodLabel={periodLabel}
      />

      <IncomesTable period={period} periodLabel={periodLabel} />
      <ExpensesTable period={period} periodLabel={periodLabel} />
    </div>
  )
}
