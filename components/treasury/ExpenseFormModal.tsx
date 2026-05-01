'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Modal } from './Modal'
import { CreateExpenseInput, TreasuryExpense } from '@/lib/treasuryTypes'
import { cupNumberString } from '@/lib/treasuryFormat'

type Mode = 'create' | 'edit'

interface ExpenseFormModalProps {
  open: boolean
  mode: Mode
  initialValue?: TreasuryExpense | null
  onClose: () => void
  onSubmit: (input: CreateExpenseInput) => Promise<void> | void
  submitting?: boolean
  errorMessage?: string | null
  defaultDate?: string
}

interface FormState {
  date: string
  amount: string
  description: string
  category: string
  notes: string
}

const SUGGESTED_CATEGORIES = [
  'Infraestructura',
  'Marketing',
  'Sueldos',
  'Software',
  'Servicios',
  'Impuestos',
  'Otros',
]

function todayYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function emptyState(defaultDate?: string): FormState {
  return {
    date: defaultDate || todayYMD(),
    amount: '',
    description: '',
    category: '',
    notes: '',
  }
}

function stateFromExpense(expense: TreasuryExpense): FormState {
  return {
    date: expense.date,
    amount: cupNumberString(expense.amount),
    description: expense.description,
    category: expense.category,
    notes: expense.notes ?? '',
  }
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-white/[0.08] dark:bg-[#0f1825] dark:text-white dark:placeholder-white/30 dark:focus:border-rose-500/50 dark:[color-scheme:dark]'

const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60'

export function ExpenseFormModal({
  open,
  mode,
  initialValue,
  onClose,
  onSubmit,
  submitting = false,
  errorMessage,
  defaultDate,
}: ExpenseFormModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    mode === 'edit' && initialValue ? stateFromExpense(initialValue) : emptyState(defaultDate),
  )
  const [validation, setValidation] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(
      mode === 'edit' && initialValue ? stateFromExpense(initialValue) : emptyState(defaultDate),
    )
    setValidation(null)
  }, [open, mode, initialValue, defaultDate])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidation(null)

    if (!form.date) return setValidation('La fecha es obligatoria.')
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return setValidation('El monto debe ser un numero mayor a 0.')
    }
    if (!form.description.trim()) return setValidation('La descripcion es obligatoria.')
    if (!form.category.trim()) return setValidation('La categoria es obligatoria.')

    const payload: CreateExpenseInput = {
      date: form.date,
      amount: Math.round(amount),
      description: form.description.trim(),
      category: form.category.trim(),
      notes: form.notes.trim() || null,
    }

    await onSubmit(payload)
  }

  const title = mode === 'edit' ? 'Editar egreso' : 'Registrar egreso'
  const description = mode === 'edit' ? 'Actualiza los datos del egreso' : 'Anadir un gasto al periodo'
  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Registrar egreso'

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={title}
      description={description}
      maxWidth="max-w-xl"
      preventClose={submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="exp-date">Fecha</label>
            <input
              id="exp-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="exp-amount">Monto (CUP)</label>
            <input
              id="exp-amount"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              required
              placeholder="0"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="exp-description">Descripcion</label>
          <input
            id="exp-description"
            type="text"
            required
            placeholder="Ej. Hosting Vercel Pro"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="exp-category">Categoria</label>
          <input
            id="exp-category"
            type="text"
            required
            list="exp-category-suggestions"
            placeholder="Ej. Infraestructura, Marketing..."
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className={inputClass}
          />
          <datalist id="exp-category-suggestions">
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className={labelClass} htmlFor="exp-notes">Notas</label>
          <textarea
            id="exp-notes"
            rows={3}
            placeholder="Opcional"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        {(validation || errorMessage) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {validation || errorMessage}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-white/[0.06] sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60 dark:bg-rose-500/90 dark:hover:bg-rose-500"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {submitting ? 'Guardando...' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
