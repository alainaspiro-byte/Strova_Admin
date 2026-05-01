/**
 * Exportador CSV client-side. Genera un Blob con BOM UTF-8 (compatible con Excel)
 * y dispara la descarga via <a download>.
 *
 * Moneda: CUP. Montos sin decimales.
 */

import { PeriodFilter, TreasuryExpense, TreasuryIncome } from './treasuryTypes'

const SEPARATOR = ','
const NEWLINE = '\r\n'

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function rowsToCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(SEPARATOR)).join(NEWLINE)
}

function periodLabel(period: PeriodFilter): string {
  const m = String(period.month).padStart(2, '0')
  return `${period.year}-${m}`
}

function triggerDownload(filename: string, csv: string): void {
  if (typeof window === 'undefined') return
  /** BOM para que Excel detecte UTF-8 con tildes/n. */
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  /** Liberar el objectURL un tick despues. */
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function exportIncomesToCsv(items: TreasuryIncome[], period: PeriodFilter): void {
  const header = [
    'Fecha',
    'Monto (CUP)',
    'Organizacion',
    'Plan ID',
    'Plan',
    'Ciclo',
    'Referencia de pago',
    'Notas',
    'Creado',
  ]
  const rows = items.map((i) => [
    i.date,
    Math.round(i.amount),
    i.organization,
    i.planId ?? '',
    i.planName,
    i.cycle === 'annual' ? 'Anual' : 'Mensual',
    i.paymentReference ?? '',
    i.notes ?? '',
    i.createdAt,
  ])
  const csv = rowsToCsv([header, ...rows])
  triggerDownload(`tesoreria-ingresos-${periodLabel(period)}.csv`, csv)
}

export function exportExpensesToCsv(items: TreasuryExpense[], period: PeriodFilter): void {
  const header = ['Fecha', 'Monto (CUP)', 'Descripcion', 'Categoria', 'Notas', 'Creado']
  const rows = items.map((e) => [
    e.date,
    Math.round(e.amount),
    e.description,
    e.category,
    e.notes ?? '',
    e.createdAt,
  ])
  const csv = rowsToCsv([header, ...rows])
  triggerDownload(`tesoreria-egresos-${periodLabel(period)}.csv`, csv)
}
