'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiClient, errorMessage } from '@/lib/api'
import type { OrganizationClientRow, OrganizationDetail } from '@/lib/types'

export default function ClientsPage() {
  const [rows, setRows] = useState<OrganizationClientRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<OrganizationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getOrganizations({ page: 1, perPage: 500 })
      setRows(res.items)
      setError(null)
    } catch (e) {
      setError(errorMessage(e, 'No se pudieron cargar las organizaciones'))
      setRows([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setSelected(null)
    try {
      const detail = await apiClient.getOrganizationDetail(id)
      setSelected(detail)
    } catch (e) {
      setError(errorMessage(e, 'Error al cargar el detalle'))
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = rows.filter((r) => {
    const q = searchTerm.toLowerCase()
    if (!q) return true
    return (
      r.organizationName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.adminName.toLowerCase().includes(q) ||
      r.adminEmail.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Organizaciones</h1>
        <p className="text-white/60">
          Datos desde <code className="text-white/40">GET /api/organization</code>: cada fila es la organización y
          su administrador cuando la API lo envía anidado (<code className="text-white/40">adminUser</code>,{' '}
          <code className="text-white/40">users[]</code>, etc.).
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por organización, admin, email o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-[#1a2332] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => load()}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.08] text-white/80 rounded-lg text-sm hover:bg-white/[0.1]"
        >
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <p className="text-white/40">Cargando organizaciones…</p>
      ) : (
        <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-[#111827] border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Organización
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Email admin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Contacto org.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-white/40 text-sm">
                      No hay organizaciones o ninguna coincide con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr key={client.id} className="hover:bg-[#111827]">
                      <td className="px-4 py-3 text-sm text-white font-medium">{client.organizationName}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{client.adminName}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{client.adminEmail}</td>
                      <td className="px-4 py-3 text-sm text-white/50">
                        <div>{client.email || '—'}</div>
                        <div className="text-white/35 text-xs">{client.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            client.accountStatus === 'active'
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {client.accountStatus === 'active' ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openDetail(client.id)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(detailLoading || selected) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Organización y administrador</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    setDetailLoading(false)
                  }}
                  className="text-white/40 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {detailLoading && <p className="text-white/50 text-sm">Cargando…</p>}

              {selected && !detailLoading && (
                <div className="space-y-6 text-sm">
                  <div>
                    <h3 className="text-white/50 text-xs uppercase tracking-wider mb-2">Organización</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/90">
                      <div>
                        <dt className="text-white/40">Nombre</dt>
                        <dd>{selected.organizationName}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Id</dt>
                        <dd className="font-mono text-xs">{selected.id}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Email / contacto</dt>
                        <dd>{selected.email || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Teléfono</dt>
                        <dd>{selected.phone || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Alta</dt>
                        <dd>{selected.createdAt || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-white/50 text-xs uppercase tracking-wider mb-2">Administrador</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/90">
                      <div>
                        <dt className="text-white/40">Nombre</dt>
                        <dd>{selected.adminName}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Email</dt>
                        <dd>{selected.adminEmail}</dd>
                      </div>
                      <div>
                        <dt className="text-white/40">Teléfono</dt>
                        <dd>{selected.adminPhone || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  <details className="text-white/40">
                    <summary className="cursor-pointer text-xs text-white/50">Respuesta raw (depuración)</summary>
                    <pre className="mt-2 p-3 rounded-lg bg-black/30 text-[11px] overflow-x-auto text-white/60">
                      {JSON.stringify(selected.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
