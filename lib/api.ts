import { SubscriptionStats } from './types'
import {
  extractPaginated,
  extractJwtFromLoginResponse,
  normalizeLoginUserFromResponse,
  normalizeSubscription,
  normalizeSubscriptionRequest,
  normalizeOrganizationDetail,
  normalizeOrganizationRow,
  normalizePlan,
  type BillingCycle,
  type SubscriptionRequestRow,
} from './mappers'
import type {
  OrganizationClientRow,
  OrganizationDetail,
  Subscription,
  SubscriptionPlan,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://162.220.165.172:5000/api'

/** Ruta de login confirmada en Swagger: POST /api/account/login */
const AUTH_LOGIN_PATH =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH?.trim() || '/account/login'

function normalizeEndpoint(path: string): string {
  const p = path.trim()
  if (!p) return ''
  return p.startsWith('/') ? p : `/${p}`
}

function addNgrokHeadersIfNeeded(url: string, headers: Record<string, string>) {
  if (process.env.NEXT_PUBLIC_NGROK_SKIP_BROWSER_WARNING === 'false') return
  try {
    const host = new URL(url).hostname
    if (host.includes('ngrok') || host.includes('ngrok-free')) {
      headers['ngrok-skip-browser-warning'] = 'true'
    }
  } catch {
    /* ignore */
  }
}

type RequestOptions = RequestInit & { skipAuth?: boolean }

/** El JWT viene en headers Authorization/RefreshToken de la respuesta */
function readAuthFromResponseHeaders(response: Response): {
  accessToken?: string
  refreshToken?: string
} {
  const auth = response.headers.get('authorization')
  let accessToken: string | undefined
  if (auth) {
    const a = auth.trim()
    accessToken = a.toLowerCase().startsWith('bearer ') ? a.slice(7).trim() : a
  }
  const refreshToken =
    response.headers.get('refreshtoken') ?? response.headers.get('RefreshToken') ?? undefined
  return { accessToken, refreshToken: refreshToken ?? undefined }
}

export interface ApiError {
  message: string
  status: number
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as ApiError).message === 'string' &&
    'status' in err &&
    typeof (err as ApiError).status === 'number'
  )
}

export function errorMessage(err: unknown, fallback: string): string {
  if (isApiError(err)) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export interface PaginatedResult<T> {
  items: T[]
  total?: number
}

// ─── DTOs confirmados con Swagger ────────────────────────────────────────────

export interface ApproveSubscriptionRequestDto {
  notes?: string
  paymentReference?: string
}

export interface RejectSubscriptionRequestDto {
  /** Requerido por la API (minLength: 1) */
  notes: string
}

export interface RenewSubscriptionRequest {
  /** Requerido por la API (minLength: 1) */
  billingCycle: BillingCycle
  paymentReference?: string
  notes?: string
}

export interface ChangePlanRequest {
  /** La API espera integer (int32) */
  planId: number
  /** Requerido (minLength: 1) */
  billingCycle: BillingCycle
  notes?: string
  paymentReference?: string
}

/**
 * Campos confirmados con Swagger.
 * NOTA: La API NO tiene 'price' ni 'durationDays' — usa monthlyPrice, annualPrice, maxProducts.
 * Los campos requeridos son: name y displayName.
 */
export interface CreateOrUpdatePlanRequest {
  /** Slug interno del plan, requerido */
  name: string
  /** Nombre visible, requerido */
  displayName: string
  description?: string
  maxProducts?: number
  maxUsers?: number
  maxLocations?: number
  monthlyPrice?: number
  annualPrice?: number
  isActive?: boolean
}

export interface CreateOrganizationRequest {
  name?: string
  code?: string
  description?: string
}

export interface UpdateOrganizationRequest {
  name?: string
  code?: string
  description?: string
}

export interface CreateUserRequest {
  fullName?: string
  password?: string
  email?: string
  phone?: string
  birthDate?: string
  locationId?: number
  roleId?: number
}

export interface UpdateUserRequest {
  fullName?: string
  oldPassword?: string
  password?: string
  email?: string
  phone?: string
  birthDate?: string
  locationId?: number
  organizationId?: number
  roleId?: number
}

// ─── Helpers de estadísticas ─────────────────────────────────────────────────

export function computeDashboardStats(
  subs: Subscription[],
  pendingRequestCount: number
): SubscriptionStats {
  const active = subs.filter((s) => s.status === 'active').length
  const pendingSubs = subs.filter((s) => s.status === 'pending').length
  const pending = pendingRequestCount > 0 ? pendingRequestCount : pendingSubs

  const monthlyRevenue = subs
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (Number.isFinite(s.amount) ? s.amount : 0), 0)

  const now = Date.now()
  const weekMs = 7 * 86400000
  const expiringThisWeek = subs.filter((s) => {
    if (s.status !== 'active' || !s.expiresAt) return false
    const t = new Date(s.expiresAt).getTime()
    return t >= now && t <= now + weekMs
  }).length

  return {
    active,
    pending,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    expiringThisWeek,
  }
}

// ─── ApiClient ────────────────────────────────────────────────────────────────

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchInit } = options
    const url = `${this.baseUrl}${normalizeEndpoint(endpoint)}`
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchInit.headers as Record<string, string>),
    }

    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`
    }

    addNgrokHeadersIfNeeded(url, headers)

    let response: Response
    try {
      response = await fetch(url, { ...fetchInit, headers })
    } catch (e) {
      const isNetwork =
        e instanceof TypeError &&
        (String(e.message).includes('fetch') || String(e.message).includes('NetworkError'))
      throw {
        message: isNetwork
          ? 'No se pudo conectar con la API. Verifica que el servidor esté activo y que CORS permita tu origen.'
          : errorMessage(e, 'Error de red'),
        status: 0,
      } as ApiError
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const baseMsg = (error as { message?: string }).message || `Error ${response.status}`
      let hint = ''
      if (response.status === 404) {
        hint = ' Verifica la ruta en Swagger.'
      } else if (response.status === 401) {
        hint = ' Token JWT inválido o expirado.'
      }
      throw { message: baseMsg + hint, status: response.status } as ApiError
    }

    const text = await response.text()
    if (!text) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      return {} as T
    }
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  /**
   * POST /api/account/login
   * Body: { email: string, password: string }
   * Respuesta: UserResponse (id, fullName, email, roleId, organizationId, etc.)
   * JWT en header Authorization de la respuesta.
   */
  async login(email: string, password: string) {
    const path = normalizeEndpoint(AUTH_LOGIN_PATH)
    const url = `${this.baseUrl}${path}`

    // La API usa camelCase: { email, password }
    const loginBody = { email, password }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    addNgrokHeadersIfNeeded(url, headers)

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(loginBody),
      })
    } catch (e) {
      const isNetwork =
        e instanceof TypeError &&
        (String(e.message).includes('fetch') || String(e.message).includes('NetworkError'))
      throw {
        message: isNetwork
          ? 'No se pudo conectar con la API. Revisa CORS y que el servidor esté activo.'
          : errorMessage(e, 'Error de red'),
        status: 0,
      } as ApiError
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      const baseMsg = (error as { message?: string }).message || `Error ${res.status}`
      throw { message: baseMsg, status: res.status } as ApiError
    }

    const text = await res.text()
    let json: unknown = {}
    if (text) {
      try { json = JSON.parse(text) } catch { json = {} }
    }

    const fromHeaders = readAuthFromResponseHeaders(res)
    const token = fromHeaders.accessToken ?? extractJwtFromLoginResponse(json)

    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token)
        if (fromHeaders.refreshToken) {
          localStorage.setItem('refreshToken', fromHeaders.refreshToken)
        }
      } else {
        const preview =
          typeof json === 'object' && json !== null
            ? JSON.stringify(json).slice(0, 400)
            : String(json)
        throw {
          message: `Login OK pero no se encontró JWT. Respuesta: ${preview}`,
          status: 0,
        } as ApiError
      }
    }

    const user = normalizeLoginUserFromResponse(json)
    return { token, user, raw: json }
  }

  /** POST /api/account/logout */
  async logout() {
    try {
      await this.request('/account/logout', { method: 'POST' })
    } catch {
      /* ignorar error del server; siempre limpiar local */
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      }
    }
  }

  /** POST /api/account/validate-token */
  async verifyToken() {
    return this.request('/account/validate-token', { method: 'POST' })
  }

  /** POST /api/account/refresh-token */
  async refreshToken() {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
    return this.request('/account/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  /** POST /api/account/change-password */
  async changePassword(oldPassword: string, newPassword: string) {
    return this.request('/account/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    })
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private buildQuery(params: Record<string, string | number | undefined | null>) {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v))
    })
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  /**
   * GET /api/subscription
   * Params: page, perPage, status, planId
   */
  async getSubscriptions(params?: {
    page?: number
    perPage?: number
    status?: string
    planId?: string
  }): Promise<PaginatedResult<Subscription>> {
    const query = this.buildQuery({
      page: params?.page,
      perPage: params?.perPage,
      status: params?.status,
      planId: params?.planId,
    })
    const raw = await this.request<unknown>(`/subscription${query}`)
    const { items, total } = extractPaginated<unknown>(raw)
    return { items: items.map((x) => normalizeSubscription(x)), total }
  }

  /** GET /api/subscription/{id} */
  async getSubscriptionDetail(id: string) {
    const raw = await this.request<unknown>(`/subscription/${encodeURIComponent(id)}`)
    return normalizeSubscription(raw)
  }

  /** GET /api/subscription/my-subscription (para el usuario logueado) */
  async getMySubscription() {
    const raw = await this.request<unknown>('/subscription/my-subscription')
    return normalizeSubscription(raw)
  }

  /** POST /api/subscription/{id}/renew */
  async renewSubscription(id: string, body: RenewSubscriptionRequest) {
    return this.request(`/subscription/${encodeURIComponent(id)}/renew`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * PUT /api/subscription/{id}/change-plan
   * ATENCIÓN: planId debe ser integer (int32), no string.
   */
  async changePlan(id: string, body: ChangePlanRequest) {
    return this.request(`/subscription/${encodeURIComponent(id)}/change-plan`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  // ─── Subscription Requests ─────────────────────────────────────────────────

  /**
   * GET /api/subscription/requests
   * Params: page, perPage, status
   */
  async getSubscriptionRequests(params?: {
    page?: number
    perPage?: number
    status?: string
  }): Promise<PaginatedResult<SubscriptionRequestRow>> {
    const query = this.buildQuery({
      page: params?.page,
      perPage: params?.perPage,
      status: params?.status,
    })
    const raw = await this.request<unknown>(`/subscription/requests${query}`)
    const { items, total } = extractPaginated<unknown>(raw)
    return { items: items.map((x) => normalizeSubscriptionRequest(x)), total }
  }

  /** GET /api/subscription/requests/{id} */
  async getRequestDetail(id: string) {
    const raw = await this.request<unknown>(`/subscription/requests/${encodeURIComponent(id)}`)
    return normalizeSubscriptionRequest(raw)
  }

  /** POST /api/subscription/requests/{id}/approve */
  async approveRequest(id: string, body?: ApproveSubscriptionRequestDto) {
    return this.request(`/subscription/requests/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  }

  /** POST /api/subscription/requests/{id}/reject — notes es requerido */
  async rejectRequest(id: string, body: RejectSubscriptionRequestDto) {
    return this.request(`/subscription/requests/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // ─── Plans ─────────────────────────────────────────────────────────────────

  /** GET /api/plan */
  async getPlansCatalog(): Promise<SubscriptionPlan[]> {
    const raw = await this.request<unknown>('/plan')
    if (Array.isArray(raw)) return raw.map((x) => normalizePlan(x))
    const { items } = extractPaginated<unknown>(raw)
    return items.map((x) => normalizePlan(x))
  }

  /** GET /api/plan/{id} */
  async getPlanDetail(id: string): Promise<SubscriptionPlan> {
    const raw = await this.request<unknown>(`/plan/${encodeURIComponent(id)}`)
    return normalizePlan(raw)
  }

  /**
   * POST /api/plan
   * Campos requeridos: name (slug interno) y displayName (nombre visible).
   * Usa monthlyPrice/annualPrice/maxProducts — NO price ni durationDays.
   */
  async createPlan(data: CreateOrUpdatePlanRequest) {
    const raw = await this.request<unknown>('/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return normalizePlan(raw)
  }

  /** PUT /api/plan/{id} — responde 204 sin cuerpo */
  async updatePlan(id: string, data: Partial<CreateOrUpdatePlanRequest>) {
    await this.request<unknown>(`/plan/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /** DELETE /api/plan/{id} — responde 204 sin cuerpo */
  async deletePlan(id: string) {
    await this.request(`/plan/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  // ─── Organizations ─────────────────────────────────────────────────────────

  /**
   * GET /api/organization
   * Params: page, perPage, sortOrder
   */
  async getOrganizations(params?: {
    page?: number
    perPage?: number
    sortOrder?: string
  }): Promise<PaginatedResult<OrganizationClientRow>> {
    const query = this.buildQuery({
      page: params?.page,
      perPage: params?.perPage,
      sortOrder: params?.sortOrder,
    })
    const raw = await this.request<unknown>(`/organization${query}`)
    const { items, total } = extractPaginated<unknown>(raw)
    return { items: items.map((x) => normalizeOrganizationRow(x)), total }
  }

  /**
   * Carga organizaciones y usuarios en paralelo, luego cruza por organizationId
   * para enriquecer cada fila con adminName, adminEmail y adminPhone.
   *
   * La API no devuelve datos del admin en GET /organization, pero cada UserResponse
   * tiene organizationId, fullName, email y phone, lo que permite el cruce en cliente.
   */
  async getOrganizationsWithAdmins(params?: {
    page?: number
    perPage?: number
    sortOrder?: string
  }): Promise<PaginatedResult<OrganizationClientRow>> {
    // Lanzar ambas llamadas en paralelo
    const [orgsRes, usersRaw] = await Promise.all([
      this.getOrganizations(params),
      this.request<unknown>('/user?page=1&perPage=500').catch(() => null),
    ])

    // Construir mapa organizationId → usuario admin
    const adminByOrgId = new Map<string, { name: string; email: string; phone: string }>()
    if (usersRaw) {
      const { items: userItems } = extractPaginated<unknown>(usersRaw)
      for (const u of userItems) {
        const user = u as Record<string, unknown>
        const orgId = String(user.organizationId ?? user.OrganizationId ?? '')
        if (!orgId || orgId === 'null' || orgId === 'undefined') continue
        // Tomar el primer usuario de la org como admin (o mejorar si hay campo role)
        if (!adminByOrgId.has(orgId)) {
          adminByOrgId.set(orgId, {
            name: String(user.fullName ?? user.FullName ?? '—'),
            email: String(user.email ?? user.Email ?? '—'),
            phone: String(user.phone ?? user.Phone ?? ''),
          })
        }
      }
    }

    // Enriquecer filas de organizaciones
    const enriched = orgsRes.items.map((org) => {
      const admin = adminByOrgId.get(String(org.id))
      if (!admin) return org
      return {
        ...org,
        adminName: admin.name || org.adminName,
        adminEmail: admin.email || org.adminEmail,
        phone: org.phone || admin.phone,
      }
    })

    return { items: enriched, total: orgsRes.total }
  }

  /**
   * GET /api/organization/id?id={id}
   * ATENCIÓN: el id va como query param, NO como path param.
   */
  async getOrganizationDetail(id: string): Promise<OrganizationDetail> {
    const raw = await this.request<unknown>(`/organization/id?id=${encodeURIComponent(id)}`)
    return normalizeOrganizationDetail(raw)
  }

  /** POST /api/organization */
  async createOrganization(data: CreateOrganizationRequest) {
    return this.request<unknown>('/organization', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT /api/organization?id={id}
   * ATENCIÓN: id como query param.
   */
  async updateOrganization(id: string, data: UpdateOrganizationRequest) {
    return this.request<unknown>(`/organization?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE /api/organization?id={id}
   * ATENCIÓN: id como query param.
   */
  async deleteOrganization(id: string) {
    return this.request(`/organization?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/user
   * Params: page, perPage, sortOrder
   */
  async getUsers(params?: {
    page?: number
    perPage?: number
    sortOrder?: string
  }) {
    const query = this.buildQuery({
      page: params?.page,
      perPage: params?.perPage,
      sortOrder: params?.sortOrder,
    })
    return this.request<unknown>(`/user${query}`)
  }

  /**
   * GET /api/user/id?id={id}
   * ATENCIÓN: id como query param.
   */
  async getUserDetail(id: string) {
    return this.request<unknown>(`/user/id?id=${encodeURIComponent(id)}`)
  }

  /** POST /api/user */
  async createUser(data: CreateUserRequest) {
    return this.request<unknown>('/user', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /** PUT /api/user/{id} */
  async updateUser(id: string, data: UpdateUserRequest) {
    return this.request<unknown>(`/user/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE /api/user?id={id}
   * ATENCIÓN: id como query param.
   */
  async deleteUser(id: string) {
    return this.request(`/user?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  /**
   * GET /api/dashboard/summary?from=...&to=...
   * La API tiene endpoint dedicado — NO hay que calcular en el frontend.
   */
  async getDashboardSummary(from?: string, to?: string) {
    const query = this.buildQuery({ from, to })
    return this.request<unknown>(`/dashboard/summary${query}`)
  }

  /**
   * Versión calculada localmente (fallback si el endpoint de dashboard no devuelve
   * los datos que necesita StatsCards).
   */
  async getDashboardStats(): Promise<SubscriptionStats> {
    const perPage = 500
    let pendingReqRes: PaginatedResult<SubscriptionRequestRow> = { items: [], total: 0 }
    try {
      pendingReqRes = await this.getSubscriptionRequests({ page: 1, perPage, status: 'pending' })
    } catch {
      /* sin permiso o endpoint no disponible */
    }

    const subsRes = await this.getSubscriptions({ page: 1, perPage })
    const pendingFromRequests = pendingReqRes.total ?? pendingReqRes.items.length

    return computeDashboardStats(subsRes.items, pendingFromRequests)
  }

  // ─── Settings ──────────────────────────────────────────────────────────────

  /** GET /api/setting */
  async getSettings() {
    return this.request<unknown>('/setting')
  }

  /** GET /api/setting/grouped */
  async getSettingsGrouped() {
    return this.request<unknown>('/setting/grouped')
  }

  /** PUT /api/setting/grouped */
  async updateSettingsGrouped(data: unknown) {
    return this.request<unknown>('/setting/grouped', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient()