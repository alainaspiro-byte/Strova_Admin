/** Contrato GET /api/organization (listado enriquecido con locations). */

export interface OrganizationLocationBusinessCategory {
  name: string
  icon: string
}

export interface OrganizationLocation {
  id: number
  organizationId: number
  organizationName: string
  name: string
  code: string
  description: string | null
  whatsAppContact: string | null
  photoUrl: string | null
  province: string | null
  municipality: string | null
  street: string | null
  businessHours: string | null
  coordinates: string | null
  isOpenNow: boolean
  isVerified: boolean
  offersDelivery: boolean
  offersPickup: boolean
  businessCategoryId: number | null
  businessCategory: OrganizationLocationBusinessCategory | null
  createdAt: string
  modifiedAt: string
}

export interface OrganizationEntity {
  id: number
  name: string
  code: string
  description: string | null
  isVerified: boolean
  createdAt: string
  modifiedAt: string
  locations: OrganizationLocation[]
}

export interface ApiUserDetail {
  id: number
  fullName: string
  email: string
  phone: string | null
  status: number
  createdAt: string
  organizationId: number
  roleId: number
}
