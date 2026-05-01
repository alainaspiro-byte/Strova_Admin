/**
 * Tipos del modulo de Tesoreria.
 * Independientes del API de suscripciones/orgs (texto libre en organizacion/plan).
 */

export type IncomeCycle = 'monthly' | 'annual'

export interface TreasuryIncome {
  id: string
  /** Fecha del cobro en formato YYYY-MM-DD (sin zona horaria, fecha civil). */
  date: string
  /** Monto en CUP, entero (sin decimales). */
  amount: number
  /** Texto libre. */
  organization: string
  /** ID del plan en el catalogo (puede ser null si el plan ya no existe). */
  planId: string | null
  /** Snapshot del nombre del plan al momento del cobro (preserva historico). */
  planName: string
  cycle: IncomeCycle
  paymentReference: string | null
  notes: string | null
  /** ISO 8601 con zona horaria. */
  createdAt: string
}

export interface TreasuryExpense {
  id: string
  date: string
  /** Monto en CUP, entero (sin decimales). */
  amount: number
  description: string
  category: string
  notes: string | null
  createdAt: string
}

export interface TreasurySummary {
  monthIncome: number
  monthExpense: number
  /** monthIncome - monthExpense */
  monthNet: number
  /** Balance acumulado historico (sumatoria de todos los ingresos menos todos los egresos hasta el final del periodo seleccionado). */
  totalNet: number
}

/** Filtro de periodo (mes/ano) compartido entre cards y tablas. */
export interface PeriodFilter {
  /** Ano (4 digitos). */
  year: number
  /** Mes 1..12. */
  month: number
}

export type CreateIncomeInput = Omit<TreasuryIncome, 'id' | 'createdAt'>
export type CreateExpenseInput = Omit<TreasuryExpense, 'id' | 'createdAt'>
/** Mismo shape que el create. El backend definira si usa PUT/PATCH y nos adaptaremos. */
export type UpdateIncomeInput = CreateIncomeInput
export type UpdateExpenseInput = CreateExpenseInput

/** Util: convierte un PeriodFilter al rango de fechas YYYY-MM-DD inclusivo. */
export function periodToDateRange(period: PeriodFilter): { from: string; to: string } {
  const { year, month } = period
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, '0')
  const ldd = String(lastDay).padStart(2, '0')
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${ldd}`,
  }
}

/** Util: chequea si una fecha YYYY-MM-DD cae dentro del periodo. */
export function isDateInPeriod(date: string, period: PeriodFilter): boolean {
  const { from, to } = periodToDateRange(period)
  return date >= from && date <= to
}

/** Periodo del mes actual (segun reloj del cliente). */
export function getCurrentPeriod(): PeriodFilter {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}
