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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://unequivocally-shrinelike-zara.ngrok-free.dev/api'

/** Ruta bajo NEXT_PUBLIC_API_URL → p.ej. .../api + /account/login = .../api/account/login */
const AUTH_LOGIN_PATH =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH?.trim() || '/account/login'

function normalizeEndpoint(path: string): string {
  const p = path.trim()
  if (!p) return ''
  return p.startsWith('/') ? p : `/${p}`
}

/** ngrok free: sin este header, el túnel puede responder HTML de aviso y el fetch falla con "Failed to fetch". Desactiva con NEXT_PUBLIC_NGROK_SKIP_BROWSER_WARNING=false si tu CORS no permite este header. */
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

type RequestOptions = RequestInit & { /** No enviar Bearer (login u otros anónimos) */ skipAuth?: boolean }

/** Tu API envía el JWT en headers (Authorization / RefreshToken), no en el JSON. */
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

export interface ApproveSubscriptionRequestDto {
  notes?: string
  paymentReference?: string
}

export interface RejectSubscriptionRequestDto {
  notes: string
}

export interface RenewSubscriptionRequest {
  billingCycle: BillingCycle
  paymentReference?: string
  notes?: string
}

export interface ChangePlanRequest {
  planId: number
  billingCycle: BillingCycle
  notes?: string
  paymentReference?: string
}

export type CreateOrUpdatePlanRequest = {
  name: string
  price: number
  durationDays: number
  productLimit: number
} & Record<string, unknown>

export interface CreateUserDto {
  fullName: string
  password: string
  email: string
  phone?: string
  birthDate: string
  locationId?: number
  roleId?: number
}

export interface UpdateUserDto {
  fullName?: string
  password?: string
  oldPassword?: string
  email?: string
  phone?: string
  birthDate?: string
  locationId?: number
  organizationId?: number
  roleId?: number
}

/** Útil cuando ya cargaste suscripciones y solicitudes y quieres las mismas tarjetas que el dashboard. */
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
      response = await fetch(url, {
        ...fetchInit,
        headers,
      })
    } catch (e) {
      const isNetwork =
        e instanceof TypeError &&
        (String(e.message).includes('fetch') || String(e.message).includes('NetworkError'))
      throw {
        message: isNetwork
          ? 'No se pudo conectar con la API. Si usas ngrok (gratis), suele ayudar el header ngrok-skip-browser-warning (ya activado). Revisa también CORS en el backend para tu origen (localhost), que la URL en .env.local sea correcta y que el túnel esté activo.'
          : errorMessage(e, 'Error de red'),
        status: 0,
      } as ApiError
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const baseMsg = (error as { message?: string }).message || `Error ${response.status}`
      let hint = ''
      if (response.status === 404) {
        hint =
          ' Comprueba en Swagger la ruta real de login y NEXT_PUBLIC_AUTH_LOGIN_PATH en .env.local.'
      } else if (response.status === 401) {
        hint =
          ' Comprueba que el token JWT se envía en Authorization: Bearer (tras login) y que no ha expirado.'
      }
      throw {
        message: baseMsg + hint,
        status: response.status,
      } as ApiError
    }

    const text = await response.text()
    if (!text) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      return {} as T
    }
  }

  async login(email: string, password: string) {
    const path = normalizeEndpoint(AUTH_LOGIN_PATH)
    const url = `${this.baseUrl}${path}`
    const usePascal = process.env.NEXT_PUBLIC_LOGIN_BODY_PASCALCASE === 'true'
    const loginBody = usePascal
      ? { Email: email, Password: password }
      : { email, password }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
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
          ? 'No se pudo conectar con la API. Revisa CORS y que el túnel esté activo.'
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
      try {
        json = JSON.parse(text) as unknown
      } catch {
        json = {}
      }
    }

    const fromHeaders = readAuthFromResponseHeaders(res)
    const token =
      fromHeaders.accessToken ?? extractJwtFromLoginResponse(json)

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
          message: `Login OK pero no hay JWT: revisa headers Authorization (o cuerpo). Respuesta: ${preview}`,
          status: 0,
        } as ApiError
      }
    }

    const user = normalizeLoginUserFromResponse(json)
    return { token, user, raw: json }
  }

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    }
  }

  async verifyToken() {
    return this.request('/auth/verify', { method: 'GET' })
  }

  private buildQuery(params: Record<string, string | number | undefined | null>) {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v))
    })
    const s = q.toString()
    return s ? `?${s}` : ''
  }

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
    return {
      items: items.map((x) => normalizeSubscription(x)),
      total,
    }
  }

  /**
   * Estadísticas derivadas: no hay endpoint dedicado; se usa el listado paginado
   * y, si hace falta, el conteo de solicitudes pendientes.
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

  async getSubscriptionDetail(id: string) {
    const raw = await this.request<unknown>(`/subscription/${encodeURIComponent(id)}`)
    return normalizeSubscription(raw)
  }

  async renewSubscription(id: string, body: RenewSubscriptionRequest) {
    return this.request(`/subscription/${encodeURIComponent(id)}/renew`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async changePlan(id: string, body: ChangePlanRequest) {
    return this.request(`/subscription/${encodeURIComponent(id)}/change-plan`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

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
    return {
      items: items.map((x) => normalizeSubscriptionRequest(x)),
      total,
    }
  }

  async getRequestDetail(id: string) {
    const raw = await this.request<unknown>(`/subscription/requests/${encodeURIComponent(id)}`)
    return normalizeSubscriptionRequest(raw)
  }

  async approveRequest(id: string, body?: ApproveSubscriptionRequestDto) {
    return this.request(`/subscription/requests/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  }

  async rejectRequest(id: string, body: RejectSubscriptionRequestDto) {
    return this.request(`/subscription/requests/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async getPlansCatalog(): Promise<SubscriptionPlan[]> {
    const raw = await this.request<unknown>('/plan')
    if (Array.isArray(raw)) return raw.map((x) => normalizePlan(x))
    const { items } = extractPaginated<unknown>(raw)
    return items.map((x) => normalizePlan(x))
  }

  async getPlanDetail(id: string): Promise<SubscriptionPlan> {
    const raw = await this.request<unknown>(`/plan/${encodeURIComponent(id)}`)
    return normalizePlan(raw)
  }

  async createPlan(data: CreateOrUpdatePlanRequest) {
    const raw = await this.request<unknown>('/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return normalizePlan(raw)
  }

  async updatePlan(id: string, data: Partial<CreateOrUpdatePlanRequest>) {
    const raw = await this.request<unknown>(`/plan/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return normalizePlan(raw)
  }

  async deletePlan(id: string) {
    return this.request(`/plan/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async getUsers(params?: { page?: number; perPage?: number; sortOrder?: string }) {
    const query = this.buildQuery({
      page: params?.page,
      perPage: params?.perPage,
      sortOrder: params?.sortOrder,
    })
    return this.request<unknown>(`/user${query}`)
  }

  async createUser(data: CreateUserDto) {
    return this.request<unknown>('/user', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: number, data: UpdateUserDto) {
    return this.request<unknown>(`/user/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(id: number) {
    return this.request(`/user?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async getRoles(params?: { page?: number; perPage?: number }) {
    const query = this.buildQuery({
      page: params?.page,
      perPage: params?.perPage,
    })
    return this.request<unknown>(`/role${query}`)
  }

  async getOrganizations(params?: {
    page?: number
    perPage?: number
  }): Promise<PaginatedResult<OrganizationClientRow>> {
    const query = this.buildQuery({
      page: params?.page,
      perPage: params?.perPage,
    })
    const raw = await this.request<unknown>(`/organization${query}`)
    const { items, total } = extractPaginated<unknown>(raw)
    return {
      items: items.map((x) => normalizeOrganizationRow(x)),
      total,
    }
  }

  async getOrganizationDetail(id: string): Promise<OrganizationDetail> {
    const raw = await this.request<unknown>(`/organization/${encodeURIComponent(id)}`)
    return normalizeOrganizationDetail(raw)
  }
}

export const apiClient = new ApiClient()
