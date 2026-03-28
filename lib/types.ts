/** Estados de ciclo de vida (UI + filtros). */
export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'canceled'
  | 'expired'
export type PaymentMethod = 'cash' | 'transfer' | null
/** Slug interno para badges; la API puede devolver nombres distintos (ver planName). */
export type Plan = 'basic' | 'pro' | 'enterprise' | string

export interface Subscription {
  id: string
  /** Id de organización (anidada en la respuesta de GET /subscription) */
  organizationId: string
  businessName: string
  contactEmail: string
  contactPhone: string
  /** WhatsApp del negocio (contactInfo.whatsapp o teléfono) */
  whatsAppContact?: string
  plan: Plan
  /** Nombre del plan tal como lo devuelve la API (planName) */
  planName?: string
  planId?: string
  /** Id para POST approve/reject si difiere del id de suscripción (p. ej. solicitud) */
  requestId?: string
  /** Estado exacto devuelto por la API (filtros y etiquetas) */
  status: string
  /** Días restantes desde la API (remainingDays), si existen */
  remainingDays?: number | null
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
  /** WhatsApp de la primera ubicación de la org */
  whatsAppContact?: string
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