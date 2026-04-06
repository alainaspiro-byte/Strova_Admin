'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient, errorMessage } from '@/lib/api'
import { SubscriptionPlan } from '@/lib/types'

const tableShell =
  'bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none overflow-hidden'
const theadRow = 'bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06]'
const th = 'px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider'
const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500'
const alertDialogPanel =
  'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 w-full max-w-md space-y-3 shadow-xl dark:shadow-none'

/** Botones de acciones en tabla (outline / secondary con fondo visible). */
const planActionBtn =
  'inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const planActionEdit =
  `${planActionBtn} bg-blue-500/10 border-blue-500/35 text-blue-700 hover:bg-blue-500/18 dark:bg-blue-500/15 dark:border-blue-500/40 dark:text-blue-400 dark:hover:bg-blue-500/25`
const planActionDeactivate =
  `${planActionBtn} bg-transparent border-slate-300 text-slate-600 hover:bg-slate-100 dark:bg-transparent dark:border-white/20 dark:text-white/70 dark:hover:bg-white/[0.08]`
const planActionActivate =
  `${planActionBtn} bg-emerald-500/10 border-emerald-500/40 text-emerald-800 hover:bg-emerald-500/16 dark:bg-emerald-500/15 dark:border-emerald-500/45 dark:text-emerald-400 dark:hover:bg-emerald-500/25`
const planActionDelete =
  `${planActionBtn} bg-red-500/10 border-red-500/35 text-red-700 hover:bg-red-500/16 dark:bg-red-500/15 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/25`

/** Equivalente a z.number().refine((v) => v === -1 || v > 0) para límites de plan. */
function isValidPlanLimitValue(n: number): boolean {
  return n === -1 || n > 0
}

/** Mismo cuerpo que el modal al guardar PUT /plan/{id} (objeto completo del plan). */
function buildPlanUpdateBody(plan: SubscriptionPlan, isActive: boolean) {
  const label = plan.name.trim()
  return {
    name: label,
    displayName: label,
    description: plan.description?.trim() || undefined,
    monthlyPrice: plan.price,
    annualPrice: plan.annualPrice,
    maxProducts: plan.productLimit,
    maxUsers: plan.maxUsers,
    maxLocations: plan.maxLocations,
    isActive,
  }
}

function parseLimitForSubmit(
  unlimited: boolean,
  raw: string,
  fieldLabel: string,
): { ok: true; value: number } | { ok: false; message: string } {
  if (unlimited) return { ok: true, value: -1 }
  const t = raw.trim()
  if (t === '') {
    return { ok: false, message: `${fieldLabel}: indica un número mayor que 0 o marca Ilimitado.` }
  }
  const n = parseInt(t, 10)
  if (!Number.isFinite(n) || !isValidPlanLimitValue(n)) {
    return {
      ok: false,
      message: `${fieldLabel}: solo se permiten números mayores que 0, o Ilimitado (-1).`,
    }
  }
  return { ok: true, value: n }
}

function fmtMoney(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function annualSavingsMeta(monthly: number, annual: number): { pct: number; savedYear: number } | null {
  if (!(annual > 0 && monthly > 0)) return null
  const yearEq = monthly * 12
  const pct = Math.round((1 - annual / yearEq) * 100)
  if (!(pct > 0)) return null
  return { pct, savedYear: yearEq - annual }
}

function savingPctFromPlan(price: number, annualPrice: number): string {
  const denom = price * 12
  if (denom <= 0) return '0'
  const raw = Math.round((1 - annualPrice / denom) * 100)
  return String(Math.min(100, Math.max(0, raw)))
}

function LimitBlock({ label, value }: { label: string; value: number }) {
  const unlimited = value === -1
  return (
    <div
      className={`rounded-md px-2 py-1.5 text-center min-w-[56px] ${
        unlimited
          ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
          : 'bg-slate-100 dark:bg-white/[0.06]'
      }`}
    >
      <div className="text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:text-white/45">
        {label}
      </div>
      <div
        className={`text-[13px] font-bold tabular-nums ${
          unlimited ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
        }`}
      >
        {unlimited ? '∞' : value}
      </div>
    </div>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthlyPrice: '',
    annualSavingPct: '',
    maxProducts: '',
    maxUsers: '',
    maxLocations: '',
    unlimitedProducts: false,
    unlimitedUsers: false,
    unlimitedLocations: false,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadPlans = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await apiClient.getPlansCatalog({ includeInactive: true })
      setPlans(list)
      setLoadError(null)
    } catch (e) {
      setLoadError(errorMessage(e, 'No se pudieron cargar los planes'))
      setPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const activeCount = plans.filter((p) => p.isActive === true).length

  const monthlyNum = parseFloat(formData.monthlyPrice)
  const monthlyValid = Number.isFinite(monthlyNum) && monthlyNum >= 0
  const savingPctNum = Math.min(100, Math.max(0, parseFloat(formData.annualSavingPct) || 0))
  const computedAnnualPreview =
    monthlyValid && monthlyNum > 0 ? monthlyNum * 12 * (1 - savingPctNum / 100) : 0

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan)
      const up = plan.productLimit === -1
      const uu = plan.maxUsers === -1
      const ul = plan.maxLocations === -1
      setFormData({
        name: plan.name,
        description: plan.description ?? '',
        monthlyPrice: plan.price.toString(),
        annualSavingPct: savingPctFromPlan(plan.price, plan.annualPrice),
        maxProducts: up ? '' : plan.productLimit.toString(),
        maxUsers: uu ? '' : plan.maxUsers.toString(),
        maxLocations: ul ? '' : plan.maxLocations.toString(),
        unlimitedProducts: up,
        unlimitedUsers: uu,
        unlimitedLocations: ul,
      })
    } else {
      setEditingPlan(null)
      setFormData({
        name: '',
        description: '',
        monthlyPrice: '',
        annualSavingPct: '0',
        maxProducts: '',
        maxUsers: '',
        maxLocations: '',
        unlimitedProducts: false,
        unlimitedUsers: false,
        unlimitedLocations: false,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingPlan(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const label = formData.name.trim()
      const m = parseFloat(formData.monthlyPrice)
      const pct = Math.min(100, Math.max(0, parseFloat(formData.annualSavingPct) || 0))
      const annualPrice = !Number.isFinite(m) || m <= 0 ? 0 : m * 12 * (1 - pct / 100)

      const p = parseLimitForSubmit(formData.unlimitedProducts, formData.maxProducts, 'Máx. productos')
      const u = parseLimitForSubmit(formData.unlimitedUsers, formData.maxUsers, 'Máx. usuarios')
      const l = parseLimitForSubmit(formData.unlimitedLocations, formData.maxLocations, 'Máx. ubicaciones')
      if (!p.ok) {
        alert(p.message)
        return
      }
      if (!u.ok) {
        alert(u.message)
        return
      }
      if (!l.ok) {
        alert(l.message)
        return
      }

      const payload = {
        name: label,
        displayName: label,
        description: formData.description.trim() || undefined,
        monthlyPrice: m,
        annualPrice,
        maxProducts: p.value,
        maxUsers: u.value,
        maxLocations: l.value,
        isActive: editingPlan ? editingPlan.isActive === true : true,
      }
      if (editingPlan) {
        await apiClient.updatePlan(editingPlan.id, payload)
      } else {
        await apiClient.createPlan(payload)
      }
      await loadPlans()
      handleCloseModal()
    } catch (err) {
      alert(errorMessage(err, 'Error al guardar'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    setTogglingId(plan.id)
    try {
      const nextActive = plan.isActive !== true
      const updated = await apiClient.updatePlan(plan.id, buildPlanUpdateBody(plan, nextActive))
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)))
      setToast({
        type: 'ok',
        text: nextActive ? 'Plan activado.' : 'Plan desactivado.',
      })
    } catch (err) {
      setToast({ type: 'err', text: errorMessage(err, 'No se pudo actualizar el estado') })
    } finally {
      setTogglingId(null)
    }
  }

  const runDelete = async () => {
    if (!planToDelete) return
    setDeleteBusy(true)
    try {
      await apiClient.deletePlan(planToDelete.id)
      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id))
      setToast({ type: 'ok', text: 'Plan eliminado.' })
      setPlanToDelete(null)
    } catch (err) {
      setToast({ type: 'err', text: errorMessage(err, 'Error al eliminar') })
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="p-6">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[200] max-w-sm px-4 py-3 rounded-lg text-sm shadow-lg border ${
            toast.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : 'bg-red-500/15 border-red-500/30 text-red-200'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gestión de planes</h1>
        <p className="text-slate-600 dark:text-white/60 text-sm">
          {plans.length} planes · {activeCount} activos
        </p>
        <p className="text-slate-500 dark:text-white/50 text-sm mt-2">
          Precios y límites de los planes; activa o desactiva sin borrarlos.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-800 dark:text-amber-200">
          {loadError}
        </div>
      )}

      <div className="mb-6">
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          Nuevo plan
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500 dark:text-white/40">Cargando planes…</p>
      ) : (
        <div className={tableShell}>
          <table className="w-full">
            <thead className={theadRow}>
              <tr>
                <th className={th}>Plan</th>
                <th className={th}>$/mes</th>
                <th className={th}>$/año</th>
                <th className={th}>Límites</th>
                <th className={th}>Estado</th>
                <th className={th}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-white/40">
                    No hay planes en el catálogo
                  </td>
                </tr>
              ) : (
                plans.map((plan) => {
                  const savings = annualSavingsMeta(plan.price, plan.annualPrice)
                  return (
                    <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-[#111827]">
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-900 dark:text-white">{plan.name}</div>
                        {plan.description ? (
                          <p className="text-xs text-slate-500 dark:text-white/45 mt-0.5 max-w-xs leading-snug">
                            {plan.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white tabular-nums">
                        ${fmtMoney(plan.price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800 dark:text-white">
                        <div className="tabular-nums">${fmtMoney(plan.annualPrice)}</div>
                        {savings ? (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20">
                              ahorra {savings.pct}%
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-white/40">
                              vs ${fmtMoney(savings.savedYear)}/año
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          <LimitBlock label="Prod" value={plan.productLimit} />
                          <LimitBlock label="Users" value={plan.maxUsers} />
                          <LimitBlock label="Locs" value={plan.maxLocations} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {plan.isActive === true ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 dark:bg-emerald-500/15">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"
                              aria-hidden
                            />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200/80 text-slate-600 dark:bg-white/[0.08] dark:text-white/50">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400 dark:bg-white/30" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(plan)}
                            className={planActionEdit}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={togglingId === plan.id}
                            onClick={() => handleToggleActive(plan)}
                            className={
                              plan.isActive === true ? planActionDeactivate : planActionActivate
                            }
                          >
                            {togglingId === plan.id ? '…' : plan.isActive === true ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlanToDelete(plan)}
                            className={planActionDelete}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {planToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="plan-delete-title"
        >
          <div className={alertDialogPanel}>
            <p id="plan-delete-title" className="text-sm text-slate-800 dark:text-white/90">
              ¿Eliminar el plan {planToDelete.name}? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setPlanToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-white/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => runDelete()}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-600 dark:text-red-300 disabled:opacity-40"
              >
                {deleteBusy ? '…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 dark:border-white/[0.08] max-w-lg w-full mx-4 shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingPlan ? 'Editar plan' : 'Nuevo plan'}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">
                      Precio mensual
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthlyPrice}
                      onChange={(e) => {
                        const v = e.target.value
                        setFormData((prev) => ({
                          ...prev,
                          monthlyPrice: v,
                          ...(parseFloat(v) === 0 || v === '' ? { annualSavingPct: '0' } : {}),
                        }))
                      }}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">
                      % de ahorro anual
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        disabled={!monthlyValid || monthlyNum === 0}
                        value={formData.annualSavingPct}
                        onChange={(e) => setFormData({ ...formData, annualSavingPct: e.target.value })}
                        className={`${inputClass} pr-8 ${!monthlyValid || monthlyNum === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-white/40">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                      Precio anual: ${computedAnnualPreview.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-slate-600 dark:text-white/60">
                      Máx. productos
                    </span>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/55 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.unlimitedProducts}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setFormData((prev) => ({
                            ...prev,
                            unlimitedProducts: checked,
                            ...(checked ? { maxProducts: '' } : {}),
                          }))
                        }}
                        className="rounded border-slate-300 dark:border-white/20"
                      />
                      Ilimitado
                    </label>
                    <input
                      type="number"
                      step={1}
                      value={formData.maxProducts}
                      onChange={(e) => setFormData({ ...formData, maxProducts: e.target.value })}
                      disabled={formData.unlimitedProducts}
                      required={!formData.unlimitedProducts}
                      className={`${inputClass} ${formData.unlimitedProducts ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-slate-600 dark:text-white/60">
                      Máx. usuarios
                    </span>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/55 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.unlimitedUsers}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setFormData((prev) => ({
                            ...prev,
                            unlimitedUsers: checked,
                            ...(checked ? { maxUsers: '' } : {}),
                          }))
                        }}
                        className="rounded border-slate-300 dark:border-white/20"
                      />
                      Ilimitado
                    </label>
                    <input
                      type="number"
                      step={1}
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                      disabled={formData.unlimitedUsers}
                      required={!formData.unlimitedUsers}
                      className={`${inputClass} ${formData.unlimitedUsers ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-slate-600 dark:text-white/60">
                      Máx. ubicaciones
                    </span>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/55 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.unlimitedLocations}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setFormData((prev) => ({
                            ...prev,
                            unlimitedLocations: checked,
                            ...(checked ? { maxLocations: '' } : {}),
                          }))
                        }}
                        className="rounded border-slate-300 dark:border-white/20"
                      />
                      Ilimitado
                    </label>
                    <input
                      type="number"
                      step={1}
                      value={formData.maxLocations}
                      onChange={(e) => setFormData({ ...formData, maxLocations: e.target.value })}
                      disabled={formData.unlimitedLocations}
                      required={!formData.unlimitedLocations}
                      className={`${inputClass} ${formData.unlimitedLocations ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Guardando…' : editingPlan ? 'Actualizar' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-800 dark:bg-[#111827] dark:border-white/[0.08] dark:text-white rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
