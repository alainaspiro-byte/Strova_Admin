/**
 * Estados canónicos de suscripción (una sola fuente de verdad en UI).
 * La API puede enviar variantes (p. ej. cancelled vs canceled).
 */
export type SubscriptionLifecycleStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'canceled'
  | 'expired'

/** Normaliza el string de la API al estado canónico; null = no encaja en pestañas concretas (solo "Todas"). */
export function canonicalSubscriptionStatus(status: string): SubscriptionLifecycleStatus | null {
  const x = String(status ?? '').trim().toLowerCase()
  if (x === 'pending') return 'pending'
  if (x === 'active') return 'active'
  if (x === 'rejected' || x === 'reject' || x === 'denied') return 'rejected'
  if (x === 'canceled' || x === 'cancelled' || x === 'inactive') return 'canceled'
  if (x === 'expired') return 'expired'
  return null
}

export function statusMatchesFilter(
  status: string,
  filter: 'all' | SubscriptionLifecycleStatus
): boolean {
  if (filter === 'all') return true
  const c = canonicalSubscriptionStatus(status)
  return c === filter
}
