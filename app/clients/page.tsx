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
      // Usa el método enriquecido que cruza org + usuarios para obtener admin
      const res = await apiClient.getOrganizationsWithAdmins({ page: 1, perPage: 500 })
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Organizaciones</h1>
        <p className="text-slate-600 dark:text-white/60 text-sm">
          Los datos de admin se obtienen cruzando{' '}
          <code className="text-slate-500 dark:text-white/40">GET /api/organization</code> con{' '}
          <code className="text-slate-500 dark:text-white/40">GET /api/user</code> por{' '}
          <code className="text-slate-500 dark:text-white/40">organizationId</code>.
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
          className="w-full max-w-md px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#1a2332] dark:border-white/[0.08] dark:text-white dark:placeholder-white/40"
        />
        <button
          type="button"
          onClick={() => load()}
          className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-sm hover:bg-slate-200 dark:bg-white/[0.06] dark:border-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.1]"
        >
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500 dark:text-white/40">Cargando organizaciones…</p>
      ) : (
        <div className="bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-100 dark:bg-[#111827] border-b border-slate-200 dark:border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
                    Organización
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
                    Email admin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
                    Contacto org.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-white/60 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-white/40 text-sm">
                      No hay organizaciones o ninguna coincide con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-[#111827]">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">
                        {client.organizationName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-white/80">
                        {client.adminName !== '—' ? client.adminName : (
                          <span className="text-slate-400 dark:text-white/30 italic">Sin datos</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-white/60">
                        {client.adminEmail !== '—' ? client.adminEmail : (
                          <span className="text-slate-400 dark:text-white/30 italic">Sin datos</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-white/50">
                        <div>{client.email || <span className="text-slate-400 dark:text-white/30 italic">—</span>}</div>
                        <div className="text-slate-400 dark:text-white/35 text-xs">{client.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {client.whatsAppContact ? (
                          <a
                            href={`https://wa.me/${client.whatsAppContact.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${client.organizationName}, te contactamos desde Strova.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp: ${client.whatsAppContact}`}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            {client.whatsAppContact}
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-white/20 text-xs italic">Sin WhatsApp</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            client.accountStatus === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                          }`}
                        >
                          {client.accountStatus === 'active' ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openDetail(client.id)}
                          className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
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

      {/* Modal de detalle */}
      {(detailLoading || selected) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 dark:border-white/[0.08] max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Organización y administrador</h2>
                <button
                  type="button"
                  onClick={() => { setSelected(null); setDetailLoading(false) }}
                  className="text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {detailLoading && <p className="text-slate-500 dark:text-white/50 text-sm">Cargando…</p>}

              {selected && !detailLoading && (
                <div className="space-y-6 text-sm">
                  <div>
                    <h3 className="text-slate-500 dark:text-white/50 text-xs uppercase tracking-wider mb-2">Organización</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800 dark:text-white/90">
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Nombre</dt>
                        <dd>{selected.organizationName}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Id</dt>
                        <dd className="font-mono text-xs">{selected.id}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Email / contacto</dt>
                        <dd>{selected.email || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Teléfono</dt>
                        <dd>{selected.phone || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Alta</dt>
                        <dd>{selected.createdAt || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-slate-500 dark:text-white/50 text-xs uppercase tracking-wider mb-2">Administrador</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800 dark:text-white/90">
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Nombre</dt>
                        <dd>{selected.adminName}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Email</dt>
                        <dd>{selected.adminEmail}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-white/40">Teléfono</dt>
                        <dd>{selected.adminPhone || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  <details className="text-slate-500 dark:text-white/40">
                    <summary className="cursor-pointer text-xs text-slate-500 dark:text-white/50">Respuesta raw (depuración)</summary>
                    <pre className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-black/30 text-[11px] overflow-x-auto text-slate-600 dark:text-white/60">
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