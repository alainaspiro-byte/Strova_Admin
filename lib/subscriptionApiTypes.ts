/** Contrato GET /api/subscription y entidades relacionadas (según API real). */

export interface SubscriptionPagination {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface ApiSubscriptionAdminContact {
  userId: number
  fullName: string
  phone: string | null
}

export interface ApiSubscriptionPlan {
  id: number
  displayName: string
  monthlyPrice: number
  annualPrice: number
}

export interface ApiSubscriptionOrganization {
  id: number
  name: string
  code: string
}

export type ApiSubscriptionStatus = 'pending' | 'active' | 'rejected' | 'cancelled' | 'expired'

export interface ApiSubscription {
  id: number
  billingCycle: 'monthly' | 'annual'
  status: ApiSubscriptionStatus
  startDate: string
  endDate: string
  daysRemaining: number
  plan: ApiSubscriptionPlan
  organization: ApiSubscriptionOrganization
  adminContact: ApiSubscriptionAdminContact | null
}

export type ApiSubscriptionRequestType = 'new' | 'plan_change' | 'renewal' | 'cancellation'

export type ApiSubscriptionRequestStatus = 'pending' | 'approved' | 'rejected'

export interface ApiSubscriptionRequest {
  id: number
  subscriptionId: number
  type: ApiSubscriptionRequestType
  status: ApiSubscriptionRequestStatus
  notes: string | null
  paymentReference: string | null
  createdAt: string
  reviewedAt: string | null
  subscription: ApiSubscription
  organization: ApiSubscriptionOrganization
}

export interface ApiPlan {
  id: number
  name: string
  displayName: string
  monthlyPrice: number
  annualPrice: number
  maxProducts: number
  maxUsers: number
  maxLocations: number
  isActive: boolean
}
