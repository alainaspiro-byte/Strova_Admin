'use client'

import { useState } from 'react'
import { MOCK_PLANS } from '@/lib/data'
import { SubscriptionPlan } from '@/lib/types'

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(MOCK_PLANS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    durationDays: '',
    productLimit: '',
  })

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newPlan: SubscriptionPlan = {
      id: editingPlan ? editingPlan.id : Date.now().toString(),
      name: formData.name,
      price: parseFloat(formData.price),
      durationDays: parseInt(formData.durationDays),
      productLimit: parseInt(formData.productLimit),
      createdAt: editingPlan ? editingPlan.createdAt : new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      priceHistory: editingPlan
        ? [...editingPlan.priceHistory, { price: parseFloat(formData.price), date: new Date().toISOString().split('T')[0] }]
        : [{ price: parseFloat(formData.price), date: new Date().toISOString().split('T')[0] }],
    }

    if (editingPlan) {
      setPlans(plans.map(p => p.id === editingPlan.id ? newPlan : p))
    } else {
      setPlans([...plans, newPlan])
    }

    handleCloseModal()
  }

  const handleDelete = (planId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
      setPlans(plans.filter(p => p.id !== planId))
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Gestión de Planes de Suscripción</h1>
        <p className="text-white/60">Administra los planes disponibles para suscripciones</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          Nuevo Plan
        </button>
      </div>

      <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#111827] border-b border-white/[0.06]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Duración</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Límite de Productos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-[#111827]">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{plan.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">${plan.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{plan.durationDays} días</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{plan.productLimit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleOpenModal(plan)}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Editar
                  </button>
                  <button
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-white/40 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Nombre del Plan</label>
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
                  <label className="block text-sm font-medium text-white/60 mb-1">Límite de Productos</label>
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
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingPlan ? 'Actualizar' : 'Crear'}
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