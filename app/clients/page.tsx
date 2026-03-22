'use client'

import { useState } from 'react'
import { MOCK_CLIENTS } from '@/lib/data'
import { Client } from '@/lib/types'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    accountStatus: 'active' as 'active' | 'inactive',
  })
  const [emailError, setEmailError] = useState('')

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const validateEmail = (email: string, excludeId?: string) => {
    const existingClient = clients.find(c => c.email === email && c.id !== excludeId)
    if (existingClient) {
      setEmailError('Este email ya está registrado')
      return false
    }
    setEmailError('')
    return true
  }

  const handleViewProfile = (client: Client) => {
    setSelectedClient(client)
  }

  const handleCloseProfile = () => {
    setSelectedClient(null)
  }

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        accountStatus: client.accountStatus,
      })
    } else {
      setEditingClient(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        accountStatus: 'active',
      })
    }
    setEmailError('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingClient(null)
    setEmailError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateEmail(formData.email, editingClient?.id)) {
      return
    }

    const newClient: Client = {
      id: editingClient ? editingClient.id : Date.now().toString(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      accountStatus: formData.accountStatus,
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString().split('T')[0],
      subscriptions: editingClient ? editingClient.subscriptions : [],
      associatedStores: editingClient ? editingClient.associatedStores : [],
    }

    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? newClient : c))
    } else {
      setClients([...clients, newClient])
    }

    handleCloseModal()
  }

  const handleDelete = (clientId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      setClients(clients.filter(c => c.id !== clientId))
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Gestión de Clientes</h1>
        <p className="text-white/60">Administra los clientes y sus perfiles</p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-[#1a2332] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors ml-4"
        >
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#111827] border-b border-white/[0.06]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-[#111827]">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{client.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{client.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{client.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    client.accountStatus === 'active'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}>
                    {client.accountStatus === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleViewProfile(client)}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Ver Perfil
                  </button>
                  <button
                    onClick={() => handleOpenModal(client)}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
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

      {/* Modal para Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                  <label className="block text-sm font-medium text-white/60 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value })
                      if (emailError) validateEmail(e.target.value, editingClient?.id)
                    }}
                    onBlur={() => validateEmail(formData.email, editingClient?.id)}
                    className={`w-full px-3 py-2 bg-[#111827] border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 ${
                      emailError ? 'border-red-500 focus:ring-red-500' : 'border-white/[0.08] focus:ring-blue-500'
                    }`}
                    required
                  />
                  {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Estado de Cuenta</label>
                  <select
                    value={formData.accountStatus}
                    onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingClient ? 'Actualizar' : 'Crear'}
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

      {/* Modal de Perfil */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Perfil del Cliente</h2>
                <button
                  onClick={handleCloseProfile}
                  className="text-white/40 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Información Básica</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Nombre</label>
                      <p className="text-white">{selectedClient.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Email</label>
                      <p className="text-white">{selectedClient.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Teléfono</label>
                      <p className="text-white">{selectedClient.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Estado</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedClient.accountStatus === 'active'
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}>
                        {selectedClient.accountStatus === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Historial de Suscripciones</h3>
                  <div className="space-y-3">
                    {selectedClient.subscriptions.map((sub) => (
                      <div key={sub.id} className="bg-[#111827] rounded-lg p-4 border border-white/[0.06]">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-white font-medium">{sub.businessName}</h4>
                            <p className="text-white/60 text-sm">Plan: {sub.plan} - ${sub.amount}</p>
                            <p className="text-white/60 text-sm">Estado: {sub.status}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sub.status === 'active'
                              ? 'bg-green-500/15 text-green-400'
                              : sub.status === 'pending'
                              ? 'bg-yellow-500/15 text-yellow-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Tiendas Asociadas en Strova</h3>
                  {selectedClient.associatedStores.length > 0 ? (
                    <div className="space-y-2">
                      {selectedClient.associatedStores.map((storeId) => (
                        <div key={storeId} className="text-white/70">
                          Tienda ID: {storeId}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60">No hay tiendas asociadas</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}