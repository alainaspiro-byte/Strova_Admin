import { Subscription, SubscriptionStats } from './types'

// Cliente HTTP para la API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://unequivocally-shrinelike-zara.ngrok-free.dev/api'

export interface ApiError {
  message: string
  status: number
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as Record<string, string>

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw {
        message: error.message || `Error ${response.status}`,
        status: response.status,
      } as ApiError
    }

    return response.json()
  }

  // ─── AUTENTICACIÓN ───────────────────────────────────────────
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.token)
    }
    return response
  }

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  }

  async verifyToken() {
    return this.request('/auth/verify', { method: 'GET' })
  }

  // ─── SUSCRIPCIONES ───────────────────────────────────────────
  async getSubscriptions(params?: {
    page?: number
    limit?: number
    status?: string
    planId?: string
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    if (params?.limit) query.append('limit', String(params.limit))
    if (params?.status) query.append('status', params.status)
    if (params?.planId) query.append('planId', params.planId)

    return this.request<{ data: Subscription[] }>(`/subscription?${query.toString()}`)
  }

  async getSubscriptionStats() {
    return this.request<SubscriptionStats>('/subscription')
  }

  async getSubscriptionDetail(id: string) {
    return this.request<Subscription>(`/subscription/${id}`)
  }

  async renewSubscription(id: string) {
    return this.request(`/subscription/${id}/renew`, { method: 'POST' })
  }

  async changePlan(id: string, planId: string) {
    return this.request(`/subscription/${id}/change-plan`, {
      method: 'PUT',
      body: JSON.stringify({ planId }),
    })
  }

  // ─── SOLICITUDES PENDIENTES ───────────────────────────────────
  async getRequests(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', String(params.page))
    if (params?.limit) query.append('limit', String(params.limit))
    if (params?.status) query.append('status', params.status)

    return this.request(`/subscription/requests?${query.toString()}`)
  }

  async getRequestDetail(id: string) {
    return this.request(`/subscription/requests/${id}`)
  }

  async approveRequest(id: string) {
    return this.request(`/subscription/requests/${id}/approve`, { method: 'POST' })
  }

  async rejectRequest(id: string, reason?: string) {
    return this.request(`/subscription/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  // ─── PLANES ───────────────────────────────────────────────────
  async getPlans() {
    return this.request('/plan')
  }

  async getPlanDetail(id: string) {
    return this.request(`/plan/${id}`)
  }

  async createPlan(data: {
    name: string
    price: number
    durationDays: number
    productLimit: number
  }) {
    return this.request('/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePlan(
    id: string,
    data: {
      name?: string
      price?: number
      durationDays?: number
      productLimit?: number
    }
  ) {
    return this.request(`/plan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePlan(id: string) {
    return this.request(`/plan/${id}`, { method: 'DELETE' })
  }

  // ─── ORGANIZACIONES/CLIENTES ───────────────────────────────────
  async getOrganizations() {
    return this.request('/organization')
  }

  async getOrganizationDetail(id: string) {
    return this.request(`/organization/${id}`)
  }
}

// Instancia global del cliente
export const apiClient = new ApiClient()
