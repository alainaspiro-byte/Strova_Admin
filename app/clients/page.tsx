'use client'

import { OrganizationsTable } from '@/components/OrganizationsTable'

export default function ClientsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Organizaciones</h1>
        <p className="text-slate-600 dark:text-white/60 text-sm">
          Listado cruzado con <code className="text-slate-500 dark:text-white/40">GET /api/subscription</code>; el
          email del admin se carga al abrir el detalle vía{' '}
          <code className="text-slate-500 dark:text-white/40">GET /api/user/&#123;id&#125;</code>.
        </p>
      </div>
      <OrganizationsTable />
    </div>
  )
}
