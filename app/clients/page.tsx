'use client'

import { OrganizationsTable } from '@/components/OrganizationsTable'

export default function ClientsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Organizaciones</h1>
        <p className="text-slate-500 dark:text-white/50 text-sm">
          Clientes, plan y estado; abre el detalle para contacto y verificación.
        </p>
      </div>
      <OrganizationsTable />
    </div>
  )
}
