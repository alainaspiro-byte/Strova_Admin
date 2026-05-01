'use client'

/**
 * Hooks de TanStack Query para Tesoreria.
 * Las mutaciones invalidan automaticamente las queries afectadas
 * (lista correspondiente + summary), de modo que cards y tablas
 * se mantienen sincronizadas sin trabajo manual.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'

import { apiClient, errorMessage } from './api'
import {
  CreateExpenseInput,
  CreateIncomeInput,
  PeriodFilter,
  TreasuryExpense,
  TreasuryIncome,
  TreasurySummary,
  UpdateExpenseInput,
  UpdateIncomeInput,
} from './treasuryTypes'
import type { SubscriptionPlan } from './types'

const TREASURY = ['treasury'] as const

export const treasuryKeys = {
  all: TREASURY,
  incomes: (period: PeriodFilter) => [...TREASURY, 'incomes', period.year, period.month] as const,
  expenses: (period: PeriodFilter) => [...TREASURY, 'expenses', period.year, period.month] as const,
  summary: (period: PeriodFilter) => [...TREASURY, 'summary', period.year, period.month] as const,
  plans: () => [...TREASURY, 'plans'] as const,
}

interface ListResult<T> {
  items: T[]
  total: number
}

export function useIncomes(period: PeriodFilter): UseQueryResult<ListResult<TreasuryIncome>, Error> {
  return useQuery({
    queryKey: treasuryKeys.incomes(period),
    queryFn: () => apiClient.getTreasuryIncomes(period),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useExpenses(period: PeriodFilter): UseQueryResult<ListResult<TreasuryExpense>, Error> {
  return useQuery({
    queryKey: treasuryKeys.expenses(period),
    queryFn: () => apiClient.getTreasuryExpenses(period),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useTreasurySummary(period: PeriodFilter): UseQueryResult<TreasurySummary, Error> {
  return useQuery({
    queryKey: treasuryKeys.summary(period),
    queryFn: () => apiClient.getTreasurySummary(period),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useCreateIncome(period: PeriodFilter): UseMutationResult<TreasuryIncome, Error, CreateIncomeInput> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateIncomeInput) => apiClient.createTreasuryIncome(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treasuryKeys.incomes(period) })
      qc.invalidateQueries({ queryKey: treasuryKeys.summary(period) })
    },
  })
}

export function useDeleteIncome(period: PeriodFilter): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTreasuryIncome(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treasuryKeys.incomes(period) })
      qc.invalidateQueries({ queryKey: treasuryKeys.summary(period) })
    },
  })
}

export function useUpdateIncome(
  period: PeriodFilter,
): UseMutationResult<TreasuryIncome, Error, { id: string; input: UpdateIncomeInput }> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => apiClient.updateTreasuryIncome(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treasuryKeys.incomes(period) })
      qc.invalidateQueries({ queryKey: treasuryKeys.summary(period) })
    },
  })
}

export function useCreateExpense(period: PeriodFilter): UseMutationResult<TreasuryExpense, Error, CreateExpenseInput> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => apiClient.createTreasuryExpense(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treasuryKeys.expenses(period) })
      qc.invalidateQueries({ queryKey: treasuryKeys.summary(period) })
    },
  })
}

export function useDeleteExpense(period: PeriodFilter): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTreasuryExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treasuryKeys.expenses(period) })
      qc.invalidateQueries({ queryKey: treasuryKeys.summary(period) })
    },
  })
}

export function useUpdateExpense(
  period: PeriodFilter,
): UseMutationResult<TreasuryExpense, Error, { id: string; input: UpdateExpenseInput }> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }) => apiClient.updateTreasuryExpense(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: treasuryKeys.expenses(period) })
      qc.invalidateQueries({ queryKey: treasuryKeys.summary(period) })
    },
  })
}

/**
 * Catalogo de planes para el formulario de ingresos. Cacheado 5 minutos
 * porque cambia poco y se consulta cada vez que se abre el modal.
 * Incluye inactivos para que un cobro de un plan retirado siga siendo editable.
 */
export function usePlansForTreasury(): UseQueryResult<SubscriptionPlan[], Error> {
  return useQuery({
    queryKey: treasuryKeys.plans(),
    queryFn: () => apiClient.getPlansCatalog({ includeInactive: true }),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })
}

/** Util de UI: extrae mensaje legible de un error de query/mutation. */
export function treasuryErrorMessage(err: unknown, fallback = 'Operacion fallida'): string {
  return errorMessage(err, fallback)
}
