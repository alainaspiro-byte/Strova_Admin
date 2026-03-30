import type { OrganizationClientRow, OrganizationDetail } from './types'
import { Plan, Subscription, SubscriptionPlan } from './types'

/** Valores típicos de ciclo de facturación en la API (ajusta si el backend usa otros). */
export type BillingCycle = string

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return null
}

function pick(
  raw: Record<string, unknown>,
  keys: string[],
  fallback = ''
): string {
  for (const k of keys) {
    const v = raw[k]
    if (v !== undefined && v !== null) return String(v)
  }
  return fallback
}

function pickNum(raw: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return fallback
}

/** Estado normalizado (canceled sin doble l; compatible con filtros de UI). */
function subscriptionStatusFromApi(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const map: Record<number, string> = {
      0: 'pending',
      1: 'active',
      2: 'canceled',
      3: 'expired',
      4: 'rejected',
    }
    if (raw in map) return map[raw as keyof typeof map]
    return String(raw)
  }
  let s = String(raw ?? '').trim().toLowerCase()
  if (s === 'cancelled') s = 'canceled'
  return s
}

/** Mapea slug de plan conocido o devuelve el nombre tal cual para mostrar. */
function normalizePlanKey(planRaw: unknown, planObj: unknown): Plan {
  const name = String(planRaw ?? '').toLowerCase()
  if (name === 'basic' || name === 'pro' || name === 'enterprise') return name
  const p = asRecord(planObj)
  if (p) {
    const n = pick(p, ['name', 'Name', 'slug', 'Slug']).toLowerCase()
    if (n.includes('básico') || n.includes('basico') || n.includes('basic')) return 'basic'
    if (n.includes('pro') && !n.includes('enterprise')) return 'pro'
    if (n.includes('empresa') || n.includes('enterprise')) return 'enterprise'
  }
  return 'basic'
}

/** Listas paginadas: { result: [...] } o { result: { items: [], totalCount } } (API .NET habitual). */
export function extractPaginated<T>(raw: unknown): { items: T[]; total?: number } {
  if (raw == null) return { items: [] }
  if (Array.isArray(raw)) return { items: raw as T[], total: raw.length }
  const o = asRecord(raw)
  if (!o) return { items: [] }

  const directArrays = [o.result, o.Result, o.data, o.Data, o.items, o.Items, o.results, o.Results]
  for (const c of directArrays) {
    if (Array.isArray(c)) return { items: c as T[], total: totalFrom(o) }
  }

  for (const key of ['result', 'Result', 'data', 'Data']) {
    const inner = o[key]
    const rec = asRecord(inner)
    if (!rec) continue
    const nested = tryArrayFromRecord(rec)
    if (nested) {
      return { items: nested as T[], total: totalFrom(rec) ?? totalFrom(o) }
    }
  }

  return { items: [], total: totalFrom(o) }
}

function tryArrayFromRecord(rec: Record<string, unknown>): unknown[] | null {
  const keys = [
    'items',
    'Items',
    'data',
    'Data',
    'results',
    'Results',
    'subscriptions',
    'Subscriptions',
    'requests',
    'Requests',
  ]
  for (const k of keys) {
    const v = rec[k]
    if (Array.isArray(v)) return v
  }
  return null
}

function totalFrom(o: Record<string, unknown>): number | undefined {
  const t =
    o.totalCount ??
    o.TotalCount ??
    o.total ??
    o.Total ??
    o.count ??
    o.Count ??
    o.totalRecords ??
    o.TotalRecords
  return typeof t === 'number' ? t : undefined
}

/** Respuestas de detalle: { result: { ...entidad } } */
export function unwrapApiEntity(raw: unknown): unknown {
  if (raw == null) return raw
  const o = asRecord(raw)
  if (!o) return raw
  const r = o.result ?? o.Result ?? o.data ?? o.Data
  if (r != null && !Array.isArray(r) && typeof r === 'object') {
    return r
  }
  return raw
}

const JWT_KEYS = [
  'accessToken',
  'AccessToken',
  'token',
  'Token',
  'access_token',
  'jwtToken',
  'JwtToken',
  'jwt',
  'bearerToken',
]

function pickJwtString(o: Record<string, unknown>): string | undefined {
  for (const k of JWT_KEYS) {
    const v = o[k]
    if (typeof v !== 'string' || v.length < 8) continue
    if (v.split('.').length >= 3) return v
    if (v.length >= 32) return v
  }
  return undefined
}

/** Busca JWT en el JSON de login (incl. { result: { accessToken: "..." } }). */
export function extractJwtFromLoginResponse(raw: unknown): string | undefined {
  if (raw == null) return undefined
  const direct = asRecord(raw)
  if (direct) {
    const t = pickJwtString(direct)
    if (t) return t
  }
  const unwrapped = unwrapApiEntity(raw)
  const inner = asRecord(unwrapped)
  if (inner) {
    const t = pickJwtString(inner)
    if (t) return t
  }
  return deepFindJwt(raw, 0)
}

function deepFindJwt(obj: unknown, depth: number): string | undefined {
  if (depth > 5 || obj == null || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  const t = pickJwtString(o)
  if (t) return t
  for (const k of ['result', 'Result', 'data', 'Data', 'value', 'Value']) {
    if (k in o) {
      const inner = deepFindJwt(o[k], depth + 1)
      if (inner) return inner
    }
  }
  return undefined
}

export function extractUserFromLoginResponse(raw: unknown): unknown {
  const top = asRecord(raw)
  const inner = asRecord(unwrapApiEntity(raw))
  return inner?.user ?? inner?.User ?? top?.user ?? top?.User
}

/** Perfil en `result` del login (fullName, roleId, etc.). */
export function normalizeLoginUserFromResponse(raw: unknown): {
  id: string
  email: string
  name?: string
  role?: string
} | null {
  const inner = asRecord(unwrapApiEntity(raw))
  if (!inner) return null
  const email = pick(inner, ['email', 'Email'])
  if (!email) return null
  const name = pick(inner, ['fullName', 'FullName', 'name', 'Name'])
  const roleName = pick(inner, ['role', 'Role'])
  const roleId = inner.roleId ?? inner.RoleId
  return {
    id: pick(inner, ['id', 'Id'], '0'),
    email,
    name: name || undefined,
    role: roleName || (roleId != null ? String(roleId) : undefined),
  }
}

/**
 * Normaliza un objeto de suscripción devuelto por la API (camelCase o PascalCase).
 */
export function normalizeSubscription(raw: unknown): Subscription {
  const unwrapped = unwrapApiEntity(raw)
  const o = asRecord(unwrapped) ?? {}

  const org = asRecord(
    o.organization ?? o.Organization ?? o.org ?? o.Org
  )
  const admin = asRecord(o.adminContact ?? o.AdminContact)

  const organizationId =
    pick(o, ['organizationId', 'OrganizationId']) ||
    (org ? pick(org, ['id', 'Id']) : '') ||
    ''

  const businessName =
    pick(o, ['businessName', 'BusinessName']) ||
    pick(o, ['organizationName', 'OrganizationName']) ||
    (org ? pick(org, ['name', 'Name', 'businessName', 'BusinessName', 'displayName', 'DisplayName']) : '') ||
    '—'

  const adminEmail = admin
    ? pick(admin, ['email', 'Email', 'contactEmail', 'ContactEmail'])
    : ''
  const adminPhone = admin
    ? pick(admin, [
        'phone',
        'Phone',
        'mobile',
        'Mobile',
        'whatsApp',
        'WhatsApp',
        'whatsAppContact',
        'WhatsAppContact',
      ])
    : ''

  const contactEmail =
    pick(o, ['contactEmail', 'ContactEmail']) ||
    (org ? pick(org, ['email', 'Email', 'contactEmail', 'ContactEmail']) : '') ||
    adminEmail ||
    ''

  const contactPhone =
    pick(o, ['contactPhone', 'ContactPhone']) ||
    (org ? pick(org, ['phone', 'Phone', 'contactPhone', 'ContactPhone']) : '') ||
    adminPhone ||
    ''

  // WhatsApp: locations[] de la org, o teléfono del adminContact
  const orgLocations = org ? (org.locations ?? org.Locations) : null
  const firstLocation = Array.isArray(orgLocations) && orgLocations.length > 0
    ? asRecord(orgLocations[0])
    : null
  const whatsAppContact =
    pick(o, ['whatsAppContact', 'WhatsAppContact']) ||
    (firstLocation ? pick(firstLocation, ['whatsAppContact', 'WhatsAppContact']) : '') ||
    adminPhone ||
    ''

  const planObj = o.plan ?? o.Plan
  const planRec = asRecord(planObj)
  const planId =
    pick(o, ['planId', 'PlanId']) || (planRec ? pick(planRec, ['id', 'Id']) : '')

  const planName =
    (planRec ? pick(planRec, ['displayName', 'DisplayName', 'name', 'Name', 'slug', 'Slug']) : '') ||
    pick(o, ['planName', 'PlanName']) ||
    planId

  const plan = normalizePlanKey(planName || planId, planObj)

  const amount = pickNum(o, [
    'amount',
    'Amount',
    'monthlyPrice',
    'MonthlyPrice',
    'price',
    'Price',
    'currentPrice',
    'CurrentPrice',
  ])

  const requestId =
    pick(o, ['subscriptionRequestId', 'SubscriptionRequestId', 'requestId', 'RequestId']) || undefined

  const expiresRaw =
    pick(o, [
      'expirationDate',
      'ExpirationDate',
      'expiresAt',
      'ExpiresAt',
      'endDate',
      'EndDate',
      'expiresOn',
      'ExpiresOn',
      'end',
      'End',
    ]) || null

  let remainingDays: number | null = null
  const rd = o.remainingDays ?? o.RemainingDays ?? o.daysRemaining ?? o.DaysRemaining
  if (typeof rd === 'number' && Number.isFinite(rd)) remainingDays = rd
  else if (typeof rd === 'string' && rd.trim() !== '') {
    const n = parseInt(rd, 10)
    if (!Number.isNaN(n)) remainingDays = n
  }

  const statusStr = subscriptionStatusFromApi(
    o.status ?? o.Status ?? o.subscriptionStatus ?? o.SubscriptionStatus
  )

  return {
    id: pick(o, ['id', 'Id'], '0'),
    organizationId,
    businessName,
    contactEmail,
    contactPhone,
    whatsAppContact: whatsAppContact || undefined,
    plan,
    planName: planName || undefined,
    planId: planId || undefined,
    requestId: requestId || undefined,
    status: statusStr,
    remainingDays,
    paymentMethod: null,
    amount,
    startsAt:
      pick(o, ['startsAt', 'StartsAt', 'startDate', 'StartDate', 'start', 'Start']) || null,
    expiresAt: expiresRaw || null,
    notes: pick(o, ['notes', 'Notes']) || null,
    createdAt: pick(o, ['createdAt', 'CreatedAt', 'created', 'Created']) || new Date().toISOString(),
  }
}

export interface SubscriptionRequestRow {
  id: string
  organizationId: string
  businessName: string
  contactEmail: string
  /** WhatsApp o teléfono (org locations / adminContact en la respuesta de solicitudes) */
  whatsAppContact: string
  status: string
  planLabel: string
  createdAt: string
  raw: Record<string, unknown>
}

export function normalizeSubscriptionRequest(raw: unknown): SubscriptionRequestRow {
  const unwrapped = unwrapApiEntity(raw)
  const o = asRecord(unwrapped) ?? {}
  const org = asRecord(o.organization ?? o.Organization)
  const plan = asRecord(o.plan ?? o.Plan)
  const admin = asRecord(o.adminContact ?? o.AdminContact)

  const organizationId =
    pick(o, ['organizationId', 'OrganizationId']) ||
    (org ? pick(org, ['id', 'Id']) : '') ||
    ''

  const businessName =
    pick(o, ['businessName', 'BusinessName']) ||
    (org ? pick(org, ['name', 'Name', 'displayName', 'DisplayName']) : '') ||
    '—'

  const adminPhone = admin
    ? pick(admin, [
        'phone',
        'Phone',
        'mobile',
        'Mobile',
        'whatsApp',
        'WhatsApp',
        'whatsAppContact',
        'WhatsAppContact',
      ])
    : ''
  const orgLocations = org ? (org.locations ?? org.Locations) : null
  const firstLocation = Array.isArray(orgLocations) && orgLocations.length > 0
    ? asRecord(orgLocations[0])
    : null
  const locWa = firstLocation
    ? pick(firstLocation, ['whatsAppContact', 'WhatsAppContact'])
    : ''

  const contactEmail =
    pick(o, ['contactEmail', 'ContactEmail']) ||
    (org ? pick(org, ['email', 'Email']) : '') ||
    (admin ? pick(admin, ['email', 'Email']) : '') ||
    ''

  const planLabel =
    (plan ? pick(plan, ['displayName', 'DisplayName', 'name', 'Name']) : '') ||
    pick(o, ['planName', 'PlanName']) ||
    pick(o, ['planId', 'PlanId']) ||
    '—'

  const statusStr = String(o.status ?? o.Status ?? '').trim()
  const whats = pick(o, ['whatsAppContact', 'WhatsAppContact']) || locWa || adminPhone

  return {
    id: pick(o, ['id', 'Id'], '0'),
    organizationId,
    businessName,
    contactEmail,
    whatsAppContact: whats,
    status: statusStr,
    planLabel,
    createdAt: pick(o, ['createdAt', 'CreatedAt']) || '',
    raw: o,
  }
}

/** Opcional: combina detalle de organización con una fila ya normalizada (p. ej. mocks). */
export function mergeSubscriptionWithOrg(
  sub: Subscription,
  org: OrganizationDetail | null | undefined
): Subscription {
  const safe = (v: string) => (v && v.trim() !== '' ? v : '—')
  if (!org) {
    return {
      ...sub,
      businessName: safe(sub.businessName),
      contactEmail: safe(sub.contactEmail),
      contactPhone: safe(sub.contactPhone),
    }
  }
  const wa = (org.whatsAppContact || '').trim()
  const phone = (org.phone || '').trim()
  const whats =
    wa || phone || (sub.whatsAppContact || '').trim() || (sub.contactPhone || '').trim()
  return {
    ...sub,
    businessName: safe(org.organizationName || sub.businessName),
    contactEmail: safe(org.email || sub.contactEmail),
    contactPhone: safe(phone || sub.contactPhone),
    whatsAppContact: whats || undefined,
  }
}

export function normalizePlan(raw: unknown): SubscriptionPlan {
  const o = asRecord(unwrapApiEntity(raw)) ?? {}
  const id = pick(o, ['id', 'Id'], '0')
  const price = pickNum(o, [
    'monthlyPrice',
    'MonthlyPrice',
    'price',
    'Price',
    'amount',
    'Amount',
  ])
  const annualPrice = pickNum(o, ['annualPrice', 'AnnualPrice'])
  const maxProducts = pickNum(o, ['maxProducts', 'MaxProducts', 'productLimit', 'ProductLimit'])
  const maxUsers = pickNum(o, ['maxUsers', 'MaxUsers'])
  const maxLocations = pickNum(o, ['maxLocations', 'MaxLocations'])

  const displayName = pick(o, ['displayName', 'DisplayName'])
  const slugName = pick(o, ['name', 'Name'], 'Plan')
  const name = displayName || slugName
  const description = pick(o, ['description', 'Description'])

  return {
    id,
    name,
    price,
    annualPrice: Number.isFinite(annualPrice) ? annualPrice : 0,
    productLimit: Number.isFinite(maxProducts) ? maxProducts : 0,
    maxUsers: Number.isFinite(maxUsers) ? maxUsers : 0,
    maxLocations: Number.isFinite(maxLocations) ? maxLocations : 0,
    description: description || undefined,
    createdAt: pick(o, ['createdAt', 'CreatedAt']) || '',
    updatedAt: pick(o, ['updatedAt', 'UpdatedAt']) || '',
    priceHistory: [],
    isActive: o.isActive === true || o.IsActive === true || o.active === true || o.Active === true,
  }
}

function findAdminUser(o: Record<string, unknown>): Record<string, unknown> | null {
  const directKeys = [
    'adminUser',
    'AdminUser',
    'admin',
    'Admin',
    'organizationAdmin',
    'OrganizationAdmin',
    'owner',
    'Owner',
    'primaryUser',
    'PrimaryUser',
  ]
  for (const k of directKeys) {
    const r = asRecord(o[k])
    if (r && Object.keys(r).length) return r
  }
  const users = o.users ?? o.Users
  if (Array.isArray(users)) {
    for (const u of users) {
      const ur = asRecord(u)
      if (!ur) continue
      const role = String(ur.role ?? ur.Role ?? ur.roleName ?? '').toLowerCase()
      if (
        role.includes('admin') ||
        role.includes('owner') ||
        role.includes('org') ||
        role.includes('manager')
      ) {
        return ur
      }
    }
    const first = asRecord(users[0])
    if (first) return first
  }
  return null
}

function normalizeOrgAccountStatus(v: unknown): 'active' | 'inactive' {
  const s = String(v ?? '').toLowerCase()
  if (
    s === 'inactive' ||
    s === 'disabled' ||
    s === 'suspended' ||
    s === 'false' ||
    s === '0'
  ) {
    return 'inactive'
  }
  if (v === false) return 'inactive'
  return 'active'
}

export function normalizeOrganizationRow(raw: unknown): OrganizationClientRow {
  const o = asRecord(unwrapApiEntity(raw)) ?? asRecord(raw) ?? {}
  const admin = findAdminUser(o)

  const organizationName =
    pick(o, [
      'name',
      'Name',
      'displayName',
      'DisplayName',
      'businessName',
      'BusinessName',
      'companyName',
      'CompanyName',
      'organizationName',
      'OrganizationName',
    ]) || '—'

  const orgEmail = pick(o, ['email', 'Email', 'contactEmail', 'ContactEmail'])
  const contactInfo = asRecord(o.contactInfo ?? o.ContactInfo)
  const ciWhatsapp = contactInfo ? pick(contactInfo, ['whatsapp', 'WhatsApp']) : ''
  const ciPhone = contactInfo ? pick(contactInfo, ['phone', 'Phone']) : ''
  const orgPhone =
    pick(o, ['phone', 'Phone', 'contactPhone', 'ContactPhone']) || ciPhone

  // WhatsApp: contactInfo.whatsapp → contactInfo.phone → locations[].whatsAppContact
  const orgLocations = o.locations ?? o.Locations
  const firstOrgLocation = Array.isArray(orgLocations) && orgLocations.length > 0
    ? asRecord(orgLocations[0])
    : null
  const orgWhatsAppFromLocation = firstOrgLocation
    ? pick(firstOrgLocation, ['whatsAppContact', 'WhatsAppContact'])
    : ''
  const orgWhatsApp = (ciWhatsapp || ciPhone || orgWhatsAppFromLocation || '').trim()

  const adminName = admin
    ? pick(admin, ['fullName', 'FullName', 'name', 'Name', 'displayName', 'DisplayName'])
    : ''
  const adminEmail = admin ? pick(admin, ['email', 'Email']) : ''
  const adminPhone = admin ? pick(admin, ['phone', 'Phone']) : ''

  const statusRaw = o.status ?? o.Status ?? o.accountStatus ?? o.AccountStatus ?? o.state ?? o.State
  const accountStatus = normalizeOrgAccountStatus(
    o.isActive === false || o.IsActive === false ? 'inactive' : statusRaw
  )

  return {
    id: pick(o, ['id', 'Id'], '0'),
    organizationName,
    email: orgEmail || adminEmail || '',
    phone: orgPhone || adminPhone || ciPhone || '',
    whatsAppContact: orgWhatsApp || undefined,
    accountStatus,
    adminName: adminName || '—',
    adminEmail: adminEmail || '—',
    createdAt: pick(o, ['createdAt', 'CreatedAt']) || '',
  }
}

export function normalizeOrganizationDetail(raw: unknown): OrganizationDetail {
  const row = normalizeOrganizationRow(raw)
  const o = asRecord(unwrapApiEntity(raw)) ?? asRecord(raw) ?? {}
  const admin = findAdminUser(o)
  return {
    ...row,
    adminPhone: admin ? pick(admin, ['phone', 'Phone']) || undefined : undefined,
    raw: o,
  }
}