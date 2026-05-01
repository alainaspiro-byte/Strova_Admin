/**
 * Capa de mock para tesoreria. Activada por NEXT_PUBLIC_TREASURY_MOCK==='true'.
 * Persiste en localStorage cuando hay window; en SSR vive en memoria.
 *
 * Seed: genera datos de ejemplo en el mes actual la primera vez que se carga.
 * Moneda: CUP, montos enteros (sin decimales).
 */

import {
  CreateExpenseInput,
  CreateIncomeInput,
  PeriodFilter,
  TreasuryExpense,
  TreasuryIncome,
  TreasurySummary,
  UpdateExpenseInput,
  UpdateIncomeInput,
  getCurrentPeriod,
  isDateInPeriod,
} from './treasuryTypes'

/** Bumpear cuando cambie el shape; invalida localStorage viejo. */
const STORAGE_KEY = 'tucuadre.treasury.mock.v2'
const SIMULATED_LATENCY_MS = 180

interface MockState {
  incomes: TreasuryIncome[]
  expenses: TreasuryExpense[]
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function buildSeed(): MockState {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const dayOf = (d: number) => `${year}-${month}-${String(Math.min(d, 28)).padStart(2, '0')}`

  const incomes: TreasuryIncome[] = [
    {
      id: makeId('inc'),
      date: dayOf(3),
      amount: 1000,
      organization: 'Tienda La 83',
      planId: '1',
      planName: 'Basico',
      cycle: 'monthly',
      paymentReference: 'TRX-3829',
      notes: null,
      createdAt: new Date(`${year}-${month}-03T10:15:00Z`).toISOString(),
    },
    {
      id: makeId('inc'),
      date: dayOf(8),
      amount: 2500,
      organization: 'Electronica Vedado',
      planId: '2',
      planName: 'Pro',
      cycle: 'monthly',
      paymentReference: 'TRX-3901',
      notes: 'Pago via transferencia',
      createdAt: new Date(`${year}-${month}-08T09:42:00Z`).toISOString(),
    },
    {
      id: makeId('inc'),
      date: dayOf(15),
      amount: 25000,
      organization: 'AutoPiezas Norte',
      planId: '2',
      planName: 'Pro',
      cycle: 'annual',
      paymentReference: 'TRX-4011',
      notes: null,
      createdAt: new Date(`${year}-${month}-15T14:00:00Z`).toISOString(),
    },
    {
      id: makeId('inc'),
      date: dayOf(22),
      amount: 4000,
      organization: 'Bodega Martinez',
      planId: '3',
      planName: 'Empresarial',
      cycle: 'monthly',
      paymentReference: null,
      notes: 'Pago en efectivo',
      createdAt: new Date(`${year}-${month}-22T16:30:00Z`).toISOString(),
    },
  ]

  const expenses: TreasuryExpense[] = [
    {
      id: makeId('exp'),
      date: dayOf(5),
      amount: 1500,
      description: 'Hosting Vercel Pro',
      category: 'Infraestructura',
      notes: null,
      createdAt: new Date(`${year}-${month}-05T08:00:00Z`).toISOString(),
    },
    {
      id: makeId('exp'),
      date: dayOf(12),
      amount: 800,
      description: 'Dominio anual',
      category: 'Infraestructura',
      notes: 'Renovacion 1 ano',
      createdAt: new Date(`${year}-${month}-12T11:20:00Z`).toISOString(),
    },
    {
      id: makeId('exp'),
      date: dayOf(20),
      amount: 2200,
      description: 'Anuncios redes sociales',
      category: 'Marketing',
      notes: null,
      createdAt: new Date(`${year}-${month}-20T19:05:00Z`).toISOString(),
    },
  ]

  return { incomes, expenses }
}

function loadState(): MockState {
  if (!isBrowser()) {
    return buildSeed()
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = buildSeed()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
      return seed
    }
    const parsed = JSON.parse(raw) as MockState
    if (!parsed || !Array.isArray(parsed.incomes) || !Array.isArray(parsed.expenses)) {
      const seed = buildSeed()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
      return seed
    }
    return parsed
  } catch {
    return buildSeed()
  }
}

function persist(state: MockState): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota errors */
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS))
}

function sortByDateDesc<T extends { date: string; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt)
    return b.date.localeCompare(a.date)
  })
}

function roundCup(n: number): number {
  return Math.round(n)
}

function normalizeIncome(input: CreateIncomeInput): CreateIncomeInput {
  return { ...input, amount: roundCup(input.amount) }
}

function normalizeExpense(input: CreateExpenseInput): CreateExpenseInput {
  return { ...input, amount: roundCup(input.amount) }
}

export const treasuryMock = {
  async listIncomes(period: PeriodFilter): Promise<{ items: TreasuryIncome[]; total: number }> {
    const state = loadState()
    const items = sortByDateDesc(state.incomes.filter((i) => isDateInPeriod(i.date, period)))
    return delay({ items, total: items.length })
  },

  async createIncome(input: CreateIncomeInput): Promise<TreasuryIncome> {
    const state = loadState()
    const created: TreasuryIncome = {
      ...normalizeIncome(input),
      id: makeId('inc'),
      createdAt: new Date().toISOString(),
    }
    const next: MockState = { ...state, incomes: [created, ...state.incomes] }
    persist(next)
    return delay(created)
  },

  async updateIncome(id: string, input: UpdateIncomeInput): Promise<TreasuryIncome> {
    const state = loadState()
    const existing = state.incomes.find((i) => i.id === id)
    if (!existing) {
      return delay(Promise.reject(new Error('Ingreso no encontrado'))) as unknown as Promise<TreasuryIncome>
    }
    const updated: TreasuryIncome = {
      ...existing,
      ...normalizeIncome(input),
      id: existing.id,
      createdAt: existing.createdAt,
    }
    const next: MockState = {
      ...state,
      incomes: state.incomes.map((i) => (i.id === id ? updated : i)),
    }
    persist(next)
    return delay(updated)
  },

  async deleteIncome(id: string): Promise<void> {
    const state = loadState()
    const next: MockState = { ...state, incomes: state.incomes.filter((i) => i.id !== id) }
    persist(next)
    return delay(undefined)
  },

  async listExpenses(period: PeriodFilter): Promise<{ items: TreasuryExpense[]; total: number }> {
    const state = loadState()
    const items = sortByDateDesc(state.expenses.filter((e) => isDateInPeriod(e.date, period)))
    return delay({ items, total: items.length })
  },

  async createExpense(input: CreateExpenseInput): Promise<TreasuryExpense> {
    const state = loadState()
    const created: TreasuryExpense = {
      ...normalizeExpense(input),
      id: makeId('exp'),
      createdAt: new Date().toISOString(),
    }
    const next: MockState = { ...state, expenses: [created, ...state.expenses] }
    persist(next)
    return delay(created)
  },

  async updateExpense(id: string, input: UpdateExpenseInput): Promise<TreasuryExpense> {
    const state = loadState()
    const existing = state.expenses.find((e) => e.id === id)
    if (!existing) {
      return delay(Promise.reject(new Error('Egreso no encontrado'))) as unknown as Promise<TreasuryExpense>
    }
    const updated: TreasuryExpense = {
      ...existing,
      ...normalizeExpense(input),
      id: existing.id,
      createdAt: existing.createdAt,
    }
    const next: MockState = {
      ...state,
      expenses: state.expenses.map((e) => (e.id === id ? updated : e)),
    }
    persist(next)
    return delay(updated)
  },

  async deleteExpense(id: string): Promise<void> {
    const state = loadState()
    const next: MockState = { ...state, expenses: state.expenses.filter((e) => e.id !== id) }
    persist(next)
    return delay(undefined)
  },

  async getSummary(period: PeriodFilter): Promise<TreasurySummary> {
    const state = loadState()
    const monthIncome = state.incomes
      .filter((i) => isDateInPeriod(i.date, period))
      .reduce((acc, i) => acc + i.amount, 0)
    const monthExpense = state.expenses
      .filter((e) => isDateInPeriod(e.date, period))
      .reduce((acc, e) => acc + e.amount, 0)

    /** Acumulado historico hasta el final del mes seleccionado. */
    const lastDay = new Date(period.year, period.month, 0).getDate()
    const mm = String(period.month).padStart(2, '0')
    const cutoff = `${period.year}-${mm}-${String(lastDay).padStart(2, '0')}`
    const totalIncome = state.incomes
      .filter((i) => i.date <= cutoff)
      .reduce((acc, i) => acc + i.amount, 0)
    const totalExpense = state.expenses
      .filter((e) => e.date <= cutoff)
      .reduce((acc, e) => acc + e.amount, 0)

    return delay({
      monthIncome: roundCup(monthIncome),
      monthExpense: roundCup(monthExpense),
      monthNet: roundCup(monthIncome - monthExpense),
      totalNet: roundCup(totalIncome - totalExpense),
    })
  },
}

/** Helper exportado para resetear el seed manualmente desde devtools. */
export function __resetTreasuryMockForTests(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(STORAGE_KEY)
  /** Limpia tambien la version anterior si quedo. */
  window.localStorage.removeItem('tucuadre.treasury.mock')
}

/** Helper para que api.ts decida si esta activo el mock. */
export function isTreasuryMockEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TREASURY_MOCK === 'true'
}

/** Re-export por conveniencia. */
export { getCurrentPeriod }
