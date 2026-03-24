'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { MOCK_ADMINS, MOCK_SYSTEM_CONFIG } from '@/lib/data'
import { AdminUser, SystemConfig } from '@/lib/types'

const tableShell =
  'bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none overflow-hidden'
const theadRow = 'bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06]'
const th = 'px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider'
const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500'
const cardForm = 'bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none p-6'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>(MOCK_ADMINS)
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(MOCK_SYSTEM_CONFIG)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as 'admin' | 'superadmin',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

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
      setAdmins(admins.map((u) => (u.id === editingUser.id ? newUser : u)))
    } else {
      setAdmins([...admins, newUser])
    }

    handleCloseUserModal()
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      setAdmins(admins.filter((u) => u.id !== userId))
    }
  }

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Configuración guardada exitosamente')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Configuración del Sistema</h1>
        <p className="text-slate-600 dark:text-white/60">Gestiona usuarios y configuraciones del sistema</p>
      </div>

      <div className="space-y-8">
        {/* Apariencia */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Apariencia</h2>
          <div className={cardForm}>
            <p className="text-sm text-slate-600 dark:text-white/50 mb-4">
              Elige entre modo claro u oscuro. La barra lateral mantiene un estilo oscuro en modo claro.
            </p>
            <div className="flex flex-wrap gap-2">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={!mounted}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mounted && theme === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.12]'
                  }`}
                >
                  {t === 'light' ? 'Modo claro' : 'Modo oscuro'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Usuarios con Acceso</h2>
            <button
              onClick={() => handleOpenUserModal()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Nuevo Usuario
            </button>
          </div>

          <div className={tableShell}>
            <table className="w-full">
              <thead className={theadRow}>
                <tr>
                  <th className={th}>Nombre</th>
                  <th className={th}>Email</th>
                  <th className={th}>Rol</th>
                  <th className={th}>Fecha de Creación</th>
                  <th className={th}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-[#111827]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">{admin.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-white/70">{admin.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-white/70">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          admin.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                        }`}
                      >
                        {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-white/70">{admin.createdAt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleOpenUserModal(admin)}
                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(admin.id)}
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
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Configuración de Alertas</h2>

          <form onSubmit={handleConfigSubmit} className={cardForm}>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-2">
                Días antes del vencimiento para marcar como &quot;En Riesgo&quot;
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={systemConfig.alertDaysBeforeExpiry}
                onChange={(e) =>
                  setSystemConfig({ ...systemConfig, alertDaysBeforeExpiry: parseInt(e.target.value, 10) })
                }
                className={inputClass}
              />
              <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
                Las suscripciones se marcarán como &quot;En Riesgo&quot; cuando falten {systemConfig.alertDaysBeforeExpiry}{' '}
                días para vencer.
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

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 dark:border-white/[0.08] max-w-md w-full mx-4 shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseUserModal}
                  className="text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Email</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Rol</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'superadmin' })
                    }
                    className={inputClass}
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
