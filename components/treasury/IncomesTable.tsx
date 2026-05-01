'use client'

import { useState } from 'react'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import { IncomeFormModal } from './IncomeFormModal'
import { exportIncomesToCsv } from '@/lib/treasuryCsv'
import { formatCup } from '@/lib/treasuryFormat'
import {
  treasuryErrorMessage,
  useCreateIncome,
  useDeleteIncome,
  useIncomes,
  useUpdateIncome,
} from '@/lib/treasuryHooks'
import { CreateIncomeInput, PeriodFilter, TreasuryIncome } from '@/lib/treasuryTypes'

interface IncomesTableProps {
  period: PeriodFilter
  periodLabel: string
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  if (!y || !m || !d) return ymd
  return `${d}/${m}/${y}`
}

export function IncomesTable({ period, periodLabel }: IncomesTableProps) {
  const incomesQuery = useIncomes(period)
  const createMut = useCreateIncome(period)
  const updateMut = useUpdateIncome(period)
  const deleteMut = useDeleteIncome(period)

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<TreasuryIncome | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<TreasuryIncome | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const items = incomesQuery.data?.items ?? []
  const isLoading = incomesQuery.isLoading
  const isFetching = incomesQuery.isFetching
  const mode: 'create' | 'edit' = editing ? 'edit' : 'create'
  const submitting = mode === 'edit' ? updateMut.isPending : createMut.isPending

  const openCreateForm = () => {
    setEditing(null)
    setFormError(null)
    setOpenForm(true)
  }

  const openEditForm = (row: TreasuryIncome) => {
    setEditing(row)
    setFormError(null)
    setOpenForm(true)
  }

  const closeForm = () => {
    if (submitting) return
    setOpenForm(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSubmit = async (input: CreateIncomeInput) => {
    setFormError(null)
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, input })
      } else {
        await createMut.mutateAsync(input)
      }
      setOpenForm(false)
      setEditing(null)
    } catch (e) {
      setFormError(
        treasuryErrorMessage(
          e,
          editing ? 'No se pudo actualizar el cobro' : 'No se pudo registrar el cobro',
        ),
      )
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleteError(null)
    try {
      await deleteMut.mutateAsync(pendingDelete.id)
      setPendingDelete(null)
    } catch (e) {
      setDeleteError(treasuryErrorMessage(e, 'No se pudo eliminar el ingreso'))
    }
  }

  const handleExport = () => {
    if (items.length === 0) return
    exportIncomesToCsv(items, period)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.06] dark:bg-[#111827] dark:shadow-none">
      <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Ingresos</h2>
          <p className="text-xs text-slate-500 dark:text-white/40">
            {isLoading ? 'Cargando...' : `${items.length} registro${items.length === 1 ? '' : 's'} en ${periodLabel}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500/90 dark:hover:bg-emerald-500"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Registrar cobro
          </button>
        </div>
      </header>

      {deleteError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 sm:px-6">
          {deleteError}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-[#0f1825]">
            <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-white/40">
              <th className="px-4 py-3 sm:px-6">Fecha</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Organizacion</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Ciclo</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Notas</th>
              <th className="px-4 py-3 sm:px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/[0.04]">
            {isLoading && items.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3 sm:px-6">
                      <div className="h-3 w-full max-w-[120px] animate-pulse rounded bg-slate-200 dark:bg-white/[0.05]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-white/40 sm:px-6">
                  No hay ingresos registrados en {periodLabel}.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-white/80 sm:px-6">{formatDate(row.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                    {formatCup(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-white/70">
                    <div className="max-w-[180px] truncate" title={row.organization}>{row.organization}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-white/70">{row.planName}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      row.cycle === 'annual'
                        ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300'
                        : 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
                    }`}>
                      {row.cycle === 'annual' ? 'Anual' : 'Mensual'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 dark:text-white/50">
                    {row.paymentReference || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-white/50">
                    <div className="max-w-[200px] truncate text-xs" title={row.notes ?? ''}>
                      {row.notes || '—'}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/60 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null)
                          setPendingDelete(row)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-red-400/80 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFetching && !isLoading && (
        <div className="border-t border-slate-200 px-4 py-2 text-right text-[11px] text-slate-400 dark:border-white/[0.04] dark:text-white/30 sm:px-6">
          Actualizando...
        </div>
      )}

      <IncomeFormModal
        open={openForm}
        mode={mode}
        initialValue={editing}
        onClose={closeForm}
        onSubmit={handleSubmit}
        submitting={submitting}
        errorMessage={formError}
      />

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onCancel={() => {
          if (!deleteMut.isPending) setPendingDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteMut.isPending}
        title="Eliminar ingreso"
        description={
          pendingDelete
            ? `Vas a eliminar el ingreso de ${formatCup(pendingDelete.amount)} del ${formatDate(pendingDelete.date)}.`
            : ''
        }
        itemLabel={pendingDelete ? `${pendingDelete.organization} · ${pendingDelete.planName}` : undefined}
      />
    </section>
  )
}
