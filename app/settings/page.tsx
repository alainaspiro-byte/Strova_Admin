'use client'

import { useState } from 'react'
import { MOCK_ADMINS, MOCK_SYSTEM_CONFIG } from '@/lib/data'
import { AdminUser, SystemConfig } from '@/lib/types'

export default function SettingsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>(MOCK_ADMINS)
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(MOCK_SYSTEM_CONFIG)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as 'admin' | 'superadmin',
  })

  const handleOpenUserModal = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user)
      setUserFormData({
        name: user.name,
        email: user.email,
        role: user.role,
      })
    } else {
      setEditingUser(null)
      setUserFormData({
        name: '',
        email: '',
        role: 'admin',
      })
    }
    setIsUserModalOpen(true)
  }

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false)
    setEditingUser(null)
  }

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newUser: AdminUser = {
      id: editingUser ? editingUser.id : Date.now().toString(),
      name: userFormData.name,
      email: userFormData.email,
      role: userFormData.role,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().split('T')[0],
    }

    if (editingUser) {
      setAdmins(admins.map(u => u.id === editingUser.id ? newUser : u))
    } else {
      setAdmins([...admins, newUser])
    }

    handleCloseUserModal()
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      setAdmins(admins.filter(u => u.id !== userId))
    }
  }

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí iría la lógica para guardar la configuración
    alert('Configuración guardada exitosamente')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Configuración del Sistema</h1>
        <p className="text-white/60">Gestiona usuarios y configuraciones del sistema</p>
      </div>

      <div className="space-y-8">
        {/* Gestión de Usuarios */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Usuarios con Acceso</h2>
            <button
              onClick={() => handleOpenUserModal()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Nuevo Usuario
            </button>
          </div>

          <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#111827] border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Fecha de Creación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-[#111827]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{admin.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{admin.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        admin.role === 'superadmin'
                          ? 'bg-purple-500/15 text-purple-400'
                          : 'bg-blue-500/15 text-blue-400'
                      }`}>
                        {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{admin.createdAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleOpenUserModal(admin)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(admin.id)}
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
        </div>

        {/* Configuración de Alertas */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Configuración de Alertas</h2>

          <form onSubmit={handleConfigSubmit} className="bg-[#1a2332] rounded-lg border border-white/[0.08] p-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Días antes del vencimiento para marcar como "En Riesgo"
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={systemConfig.alertDaysBeforeExpiry}
                onChange={(e) => setSystemConfig({ ...systemConfig, alertDaysBeforeExpiry: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-white/40 text-sm mt-1">
                Las suscripciones se marcarán como "En Riesgo" cuando falten {systemConfig.alertDaysBeforeExpiry} días para vencer.
              </p>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal para Usuario */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button
                  onClick={handleCloseUserModal}
                  className="text-white/40 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Email</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Rol</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'superadmin' })}
                    className="w-full px-3 py-2 bg-[#111827] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseUserModal}
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