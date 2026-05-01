'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal'
import { CreateIncomeInput, IncomeCycle, TreasuryIncome } from '@/lib/treasuryTypes'
import { amountsMatch, cupNumberString, formatCup } from '@/lib/treasuryFormat'
import { usePlansForTreasury } from '@/lib/treasuryHooks'
import type { SubscriptionPlan } from '@/lib/types'

type Mode = 'create' | 'edit'

interface IncomeFormModalProps {
  open: boolean
  mode: Mode
  /** Si mode==='edit', precarga el formulario con los valores. */
  initialValue?: TreasuryIncome | null
  onClose: () => void
  onSubmit: (input: CreateIncomeInput) => Promise<void> | void
  submitting?: boolean
  errorMessage?: string | null
  /** Fecha por defecto al abrir el modal (YYYY-MM-DD). Solo aplica en mode='create'. */
  defaultDate?: string
}

interface FormState {
  date: string
  amount: string
  organization: string
  planId: string
  planName: string
  cycle: IncomeCycle
  paymentReference: string
  notes: string
}

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
    organization: '',
    planId: '',
    planName: '',
    cycle: 'monthly',
    paymentReference: '',
    notes: '',
  }
}

function stateFromIncome(income: TreasuryIncome): FormState {
  return {
    date: income.date,
    amount: cupNumberString(income.amount),
    organization: income.organization,
    planId: income.planId ?? '',
    planName: income.planName,
    cycle: income.cycle,
    paymentReference: income.paymentReference ?? '',
    notes: income.notes ?? '',
  }
}

function priceForCycle(plan: SubscriptionPlan, cycle: IncomeCycle): number {
  return cycle === 'annual' ? plan.annualPrice : plan.price
}

const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.08] dark:bg-[#0f1825] dark:text-white dark:placeholder-white/30 dark:focus:border-blue-500/50 dark:[color-scheme:dark]'

const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60'

export function IncomeFormModal({
  open,
  mode,
  initialValue,
  onClose,
  onSubmit,
  submitting = false,
  errorMessage,
  defaultDate,
}: IncomeFormModalProps) {
  const plansQuery = usePlansForTreasury()
  const plans = plansQuery.data ?? []

  const [form, setForm] = useState<FormState>(() =>
    mode === 'edit' && initialValue ? stateFromIncome(initialValue) : emptyState(defaultDate),
  )
  const [validation, setValidation] = useState<string | null>(null)
  /** Si el usuario ha tocado el monto manualmente (bloquea autocompletado). */
  const userTouchedAmountRef = useRef(false)

  /** Reset al abrir. */
  useEffect(() => {
    if (!open) return
    const next =
      mode === 'edit' && initialValue
        ? stateFromIncome(initialValue)
        : emptyState(defaultDate)
    setForm(next)
    setValidation(null)
    /** En modo edit asumimos que el monto puede ser distinto al del plan;
     *  en modo create empieza limpio para que el primer cambio de plan dispare autocomplete. */
    userTouchedAmountRef.current = mode === 'edit'
  }, [open, mode, initialValue, defaultDate])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const selectedPlan: SubscriptionPlan | undefined = useMemo(() => {
    if (!form.planId) return undefined
    return plans.find((p) => p.id === form.planId)
  }, [form.planId, plans])

  /** Autocomplete del monto al cambiar plan/ciclo si el usuario no lo ha tocado. */
  useEffect(() => {
    if (!selectedPlan) return
    if (userTouchedAmountRef.current) return
    const computed = priceForCycle(selectedPlan, form.cycle)
    setForm((s) => ({ ...s, amount: cupNumberString(computed), planName: selectedPlan.name }))
  }, [selectedPlan, form.cycle])

  /** Mantener planName sincronizado con el plan seleccionado, incluso si el usuario edito el monto. */
  useEffect(() => {
    if (selectedPlan && form.planName !== selectedPlan.name) {
      setForm((s) => ({ ...s, planName: selectedPlan.name }))
    }
  }, [selectedPlan, form.planName])

  const expectedAmount =
    selectedPlan !== undefined ? priceForCycle(selectedPlan, form.cycle) : null
  const enteredAmountNum = Number(form.amount)
  const showAmountWarning =
    expectedAmount !== null &&
    Number.isFinite(enteredAmountNum) &&
    !amountsMatch(enteredAmountNum, expectedAmount)

  /** Si el plan del initialValue ya no esta en el catalogo, ofrecemos opcion ficticia. */
  const initialPlanInCatalog = useMemo(() => {
    if (!initialValue?.planId) return false
    return plans.some((p) => p.id === initialValue.planId)
  }, [initialValue?.planId, plans])

  const orphanPlanOption =
    mode === 'edit' &&
    initialValue?.planId &&
    !initialPlanInCatalog &&
    !plansQuery.isLoading
      ? { id: initialValue.planId, name: `${initialValue.planName} (eliminado)` }
      : null

  const handleAmountChange = (value: string) => {
    userTouchedAmountRef.current = true
    update('amount', value)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidation(null)

    if (!form.date) return setValidation('La fecha es obligatoria.')
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return setValidation('El monto debe ser un numero mayor a 0.')
    }
    if (!form.organization.trim()) return setValidation('La organizacion es obligatoria.')
    if (!form.planId.trim()) return setValidation('Selecciona un plan.')

    /** Si por algun motivo no hay planName (race), usamos el del estado. */
    const planNameFinal = form.planName.trim() || selectedPlan?.name || ''
    if (!planNameFinal) return setValidation('No se pudo determinar el plan.')

    const payload: CreateIncomeInput = {
      date: form.date,
      amount: Math.round(amount),
      organization: form.organization.trim(),
      planId: form.planId,
      planName: planNameFinal,
      cycle: form.cycle,
      paymentReference: form.paymentReference.trim() || null,
      notes: form.notes.trim() || null,
    }

    await onSubmit(payload)
  }

  const title = mode === 'edit' ? 'Editar cobro' : 'Registrar cobro'
  const description = mode === 'edit' ? 'Actualiza los datos del cobro' : 'Anadir un ingreso al periodo'
  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Registrar cobro'

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={title}
      description={description}
      maxWidth="max-w-2xl"
      preventClose={submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="inc-date">Fecha</label>
            <input
              id="inc-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="inc-org">Organizacion</label>
            <input
              id="inc-org"
              type="text"
              required
              placeholder="Nombre del cliente"
              value={form.organization}
              onChange={(e) => update('organization', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="inc-plan">Plan</label>
            <select
              id="inc-plan"
              required
              disabled={plansQuery.isLoading}
              value={form.planId}
              onChange={(e) => update('planId', e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                {plansQuery.isLoading ? 'Cargando planes...' : 'Selecciona un plan'}
              </option>
              {orphanPlanOption && (
                <option value={orphanPlanOption.id}>{orphanPlanOption.name}</option>
              )}
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {plansQuery.error && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                No se pudieron cargar los planes. Reintenta cerrando y abriendo el formulario.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="inc-cycle">Ciclo</label>
            <select
              id="inc-cycle"
              value={form.cycle}
              onChange={(e) => update('cycle', e.target.value as IncomeCycle)}
              className={inputClass}
            >
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="inc-amount">Monto (CUP)</label>
          <input
            id="inc-amount"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            required
            placeholder="0"
            value={form.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={inputClass}
          />
          {expectedAmount !== null && (
            <p
              className={`mt-1 text-xs ${
                showAmountWarning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-white/40'
              }`}
            >
              {showAmountWarning
                ? `Monto distinto al precio del plan (${formatCup(expectedAmount)}).`
                : `Precio del plan: ${formatCup(expectedAmount)}`}
            </p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="inc-ref">Referencia de pago</label>
          <input
            id="inc-ref"
            type="text"
            placeholder="Opcional (ID transferencia, etc.)"
            value={form.paymentReference}
            onChange={(e) => update('paymentReference', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="inc-notes">Notas</label>
          <textarea
            id="inc-notes"
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500/90 dark:hover:bg-emerald-500"
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
