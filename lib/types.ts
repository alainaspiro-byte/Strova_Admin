export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired'
export type PaymentMethod = 'cash' | 'transfer' | null
/** Slug interno para badges; la API puede devolver nombres distintos (ver planName). */
export type Plan = 'basic' | 'pro' | 'enterprise' | string

export interface Subscription {
  id: string
  businessName: string
  contactEmail: string
  contactPhone: string
  plan: Plan
  /** Nombre legible del plan desde la API */
  planName?: string
  planId?: string
  /** Si la fila enlaza con una solicitud, permite aprobar/rechazar por este id */
  requestId?: string
  status: SubscriptionStatus
  paymentMethod: PaymentMethod
  amount: number
  startsAt: string | null
  expiresAt: string | null
  notes: string | null
  createdAt: string
}

export interface SubscriptionStats {
  active: number
  pending: number
  monthlyRevenue: number
  expiringThisWeek: number
}

/** @deprecated Vista antigua con mocks; usar OrganizationClientRow + API */
export interface Client {
  id: string
  name: string
  email: string
  phone: string
  accountStatus: 'active' | 'inactive'
  createdAt: string
  subscriptions: Subscription[]
  associatedStores: string[] // IDs de tiendas en Strova
}

/** Organización + admin (GET /api/organization) */
export interface OrganizationClientRow {
  id: string
  organizationName: string
  email: string
  phone: string
  accountStatus: 'active' | 'inactive'
  adminName: string
  adminEmail: string
  createdAt: string
}

export interface OrganizationDetail extends OrganizationClientRow {
  adminPhone?: string
  raw: Record<string, unknown>
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  durationDays: number
  productLimit: number
  createdAt: string
  updatedAt: string
  priceHistory: { price: number; date: string }[]
  /** Presente si la API lo envía (catálogo público suele ser solo activos) */
  isActive?: boolean
}

export interface PaymentLog {
  id: string
  subscriptionId: string
  clientName: string
  amount: number
  date: string
  paymentMethod: PaymentMethod
  adminId: string
  adminName: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'superadmin'
  createdAt: string
}

export interface SystemConfig {
  alertDaysBeforeExpiry: number
}
