'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient, errorMessage } from '@/lib/api'
import { SubscriptionPlan } from '@/lib/types'

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
    annualPrice: '',
    maxProducts: '',
    maxUsers: '',
    maxLocations: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  const loadPlans = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await apiClient.getPlansCatalog()
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

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan)
      setFormData({
        name: plan.name,
        description: plan.description ?? '',
        monthlyPrice: plan.price.toString(),
        annualPrice: plan.annualPrice.toString(),
        maxProducts: plan.productLimit.toString(),
        maxUsers: plan.maxUsers.toString(),
        maxLocations: plan.maxLocations.toString(),
        isActive: plan.isActive !== false,
      })
    } else {
      setEditingPlan(null)
      setFormData({
        name: '',
        description: '',
        monthlyPrice: '',
        annualPrice: '',
        maxProducts: '',
        maxUsers: '',
        maxLocations: '',
        isActive: true,
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
      const payload = {
        name: label,
        displayName: label,
        description: formData.description.trim() || undefined,
        monthlyPrice: parseFloat(formData.monthlyPrice),
        annualPrice: parseFloat(formData.annualPrice),
        maxProducts: parseInt(formData.maxProducts, 10),
        maxUsers: parseInt(formData.maxUsers, 10),
        maxLocations: parseInt(formData.maxLocations, 10),
        isActive: formData.isActive,
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

  const handleDelete = async (planId: string) => {
    if (!confirm('¿Eliminar este plan? Requiere permiso plan.manage.')) return
    try {
      await apiClient.deletePlan(planId)
      await loadPlans()
    } catch (err) {
      alert(errorMessage(err, 'Error al eliminar'))
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gestión de planes</h1>
        <p className="text-slate-600 dark:text-white/60">
          Catálogo público <code className="text-slate-500 dark:text-white/40">GET /api/plan</code>; crear/editar/borrar requiere{' '}
          <code className="text-slate-500 dark:text-white/40">plan.manage</code>. Detalle por id usa <code className="text-slate-500 dark:text-white/40">plan.read</code>.
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
        <div className="bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">$/mes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">$/año</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">Límites</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">Activo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-[#111827]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white font-medium">{plan.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white">${plan.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-white">${plan.annualPrice}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-white/70">
                    P {plan.productLimit < 0 ? '∞' : plan.productLimit} · U {plan.maxUsers} · L {plan.maxLocations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-white/70">
                    {plan.isActive !== false ? 'Sí' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(plan)}
                      className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 dark:border-white/[0.08] max-w-lg w-full mx-4 shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingPlan ? 'Editar plan' : 'Nuevo plan'}</h2>
                <button type="button" onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white">
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
                    className="w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Precio mensual</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthlyPrice}
                      onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Precio anual</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.annualPrice}
                      onChange={(e) => setFormData({ ...formData, annualPrice: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Máx. productos</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxProducts}
                      onChange={(e) => setFormData({ ...formData, maxProducts: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Máx. usuarios</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Máx. ubicaciones</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxLocations}
                      onChange={(e) => setFormData({ ...formData, maxLocations: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-300 dark:border-white/20"
                  />
                  Plan activo
                </label>

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
