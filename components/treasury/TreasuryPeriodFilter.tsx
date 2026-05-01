'use client'

import { PeriodFilter } from '@/lib/treasuryTypes'

interface TreasuryPeriodFilterProps {
  value: PeriodFilter
  onChange: (next: PeriodFilter) => void
  /** Limita el rango de anos disponibles (por defecto: 5 atras hasta el ano actual). */
  yearsBack?: number
}

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.08] dark:bg-[#1a2332] dark:text-white dark:hover:border-white/[0.16] dark:focus:border-blue-500/50 dark:[color-scheme:dark]'

export function TreasuryPeriodFilter({
  value,
  onChange,
  yearsBack = 5,
}: TreasuryPeriodFilterProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: yearsBack + 1 }, (_, i) => currentYear - i)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-white/40">
        Periodo
      </span>
      <select
        aria-label="Mes"
        value={value.month}
        onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
        className={selectClass}
      >
        {MONTHS_ES.map((label, idx) => (
          <option key={label} value={idx + 1}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Ano"
        value={value.year}
        onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
        className={selectClass}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}

export function periodToLabel(period: PeriodFilter): string {
  return `${MONTHS_ES[period.month - 1]} ${period.year}`
}
