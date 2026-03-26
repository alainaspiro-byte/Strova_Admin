'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { MOCK_SYSTEM_CONFIG } from '@/lib/data'
import { SystemConfig } from '@/lib/types'
import { apiClient, errorMessage } from '@/lib/api'
import { extractPaginated } from '@/lib/mappers'

const tableShell =
  'bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none overflow-hidden'
const theadRow = 'bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06]'
const th = 'px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider'
const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500'
const cardForm = 'bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none p-6'

interface ApiUser {
  id: number
  fullName: string
  email: string
  phone?: string | null
  roleId?: number | null
}

interface ApiRole {
  id: number
  name: string
}

interface UserFormData {
  fullName: string
  email: string
  password: string
  phone: string
  birthDate: string
  roleId: string
}

const emptyForm: UserFormData = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  birthDate: '',
  roleId: '',
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<ApiUser[]>([])
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(MOCK_SYSTEM_CONFIG)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  const [userFormData, setUserFormData] = useState<UserFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [usersRaw, rolesRaw] = await Promise.all([
        apiClient.getUsers({ perPage: 100 }),
        apiClient.getRoles({ perPage: 100 }),
      ])
      const { items: userItems } = extractPaginated<ApiUser>(usersRaw)
      const { items: roleItems } = extractPaginated<ApiRole>(rolesRaw)
      setUsers(userItems)
      setRoles(roleItems)
    } catch (e) {
      setLoadError(errorMessage(e, 'No se pudieron cargar los usuarios'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const getRoleName = (roleId?: number | null) => {
    if (!roleId) return '—'
    const role = roles.find((r) => r.id === roleId)
    return role ? role.name : `Rol #${roleId}`
  }

  const handleOpenUserModal = (user?: ApiUser) => {
    if (user) {
      setEditingUser(user)
      setUserFormData({
        fullName: user.fullName ?? '',
        email: user.email ?? '',
        password: '',
        phone: user.phone ?? '',
        birthDate: '',
        roleId: user.roleId ? String(user.roleId) : '',
      })
    } else {
      setEditingUser(null)
      setUserFormData(emptyForm)
    }
    setSaveError(null)
    setIsUserModalOpen(true)
  }

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false)
    setEditingUser(null)
    setSaveError(null)
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      if (editingUser) {
        const updateData: Record<string, unknown> = {
          fullName: userFormData.fullName,
          email: userFormData.email,
          phone: userFormData.phone || undefined,
          roleId: userFormData.roleId ? parseInt(userFormData.roleId, 10) : undefined,
        }
        if (userFormData.password) {
          updateData.password = userFormData.password
        }
        await apiClient.updateUser(editingUser.id, updateData)
      } else {
        await apiClient.createUser({
          fullName: userFormData.fullName,
          email: userFormData.email,
          password: userFormData.password,
          phone: userFormData.phone || undefined,
          birthDate: userFormData.birthDate
            ? new Date(userFormData.birthDate).toISOString()
            : new Date('2000-01-01').toISOString(),
          roleId: userFormData.roleId ? parseInt(userFormData.roleId, 10) : undefined,
        })
      }
      await loadData()
      handleCloseUserModal()
    } catch (e) {
      setSaveError(errorMessage(e, 'Error al guardar el usuario'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return
    try {
      await apiClient.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      alert(errorMessage(e, 'Error al eliminar el usuario'))
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

        {/* Usuarios con Acceso */}
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

          {loadError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
              <span>{loadError}</span>
              <button
                onClick={loadData}
                className="ml-4 text-red-600 dark:text-red-400 underline hover:no-underline text-xs"
              >
                Reintentar
              </button>
            </div>
          )}

          <div className={tableShell}>
            <table className="w-full">
              <thead className={theadRow}>
                <tr>
                  <th className={th}>Nombre</th>
                  <th className={th}>Email</th>
                  <th className={th}>Teléfono</th>
                  <th className={th}>Rol</th>
                  <th className={th}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-white/40">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-white/40">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#111827]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {user.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-white/70">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-white/70">
                        {user.phone ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-white/70">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                          {getRoleName(user.roleId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleOpenUserModal(user)}
                          className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Configuración de Alertas */}
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

      {/* Modal de usuario */}
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

              {saveError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                  {saveError}
                </div>
              )}

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
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
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">
                    {editingUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className={inputClass}
                    required={!editingUser}
                    placeholder={editingUser ? '••••••••' : ''}
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">
                      Fecha de nacimiento
                    </label>
                    <input
                      type="date"
                      value={userFormData.birthDate}
                      onChange={(e) => setUserFormData({ ...userFormData, birthDate: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">
                    Teléfono <span className="text-slate-400 dark:text-white/30">(opcional)</span>
                  </label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Rol</label>
                  <select
                    value={userFormData.roleId}
                    onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Sin rol asignado</option>
                    {roles.map((role) => (
                      <option key={role.id} value={String(role.id)}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseUserModal}
                    disabled={saving}
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
