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
    price: '',
    durationDays: '',
    productLimit: '',
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
        price: plan.price.toString(),
        durationDays: plan.durationDays.toString(),
        productLimit: plan.productLimit.toString(),
      })
    } else {
      setEditingPlan(null)
      setFormData({
        name: '',
        price: '',
        durationDays: '',
        productLimit: '',
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
      const payload = {
        name: formData.name,
        price: parseFloat(formData.price),
        durationDays: parseInt(formData.durationDays, 10),
        productLimit: parseInt(formData.productLimit, 10),
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
        <h1 className="text-2xl font-bold text-white mb-2">Gestión de planes</h1>
        <p className="text-white/60">
          Catálogo público <code className="text-white/40">GET /api/plan</code>; crear/editar/borrar requiere{' '}
          <code className="text-white/40">plan.manage</code>. Detalle por id usa <code className="text-white/40">plan.read</code>.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
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
        <p className="text-white/40">Cargando planes…</p>
      ) : (
        <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#111827] border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Duración</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Límite productos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-[#111827]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{plan.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">${plan.price} <span className="text-white/40 text-xs">/mes</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                    {plan.durationDays > 0 ? `${plan.durationDays} días` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                    {plan.productLimit < 0 ? 'Ilimitado' : plan.productLimit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(plan)}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-400 hover:text-red-300 font-medium"
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
          <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">{editingPlan ? 'Editar plan' : 'Nuevo plan'}</h2>
                <button type="button" onClick={handleCloseModal} className="text-white/40 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Duración (días)</label>
                  <input
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Límite de productos</label>
                  <input
                    type="number"
                    value={formData.productLimit}
                    onChange={(e) => setFormData({ ...formData, productLimit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
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
                    className="flex-1 px-4 py-2 bg-[#111827] border border-white/[0.08] text-white rounded-lg font-medium hover:bg-white/[0.04] transition-colors"
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
