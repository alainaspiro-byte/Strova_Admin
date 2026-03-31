'use client'

import { SubscriptionsTable } from '@/components/SubscriptionsTable'

export default function SubscriptionsPage() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white/90">Suscripciones</h1>
        <p className="text-sm text-slate-500 dark:text-white/30 mt-0.5">
          Planes, estados y renovaciones
        </p>
      </div>
      <SubscriptionsTable />
    </div>
  )
}
