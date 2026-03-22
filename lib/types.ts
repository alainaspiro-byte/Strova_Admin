export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'expired'
export type PaymentMethod = 'cash' | 'transfer' | null
export type Plan = 'basic' | 'pro' | 'enterprise'

export interface Subscription {
  id: string
  businessName: string
  contactEmail: string
  contactPhone: string
  plan: Plan
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

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  durationDays: number
  productLimit: number
  createdAt: string
  updatedAt: string
  priceHistory: { price: number; date: string }[]
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
