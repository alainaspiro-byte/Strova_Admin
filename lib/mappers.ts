import type { OrganizationClientRow, OrganizationDetail } from './types'
import { Plan, Subscription, SubscriptionPlan, SubscriptionStatus } from './types'

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

function normalizeStatus(v: unknown): SubscriptionStatus {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const map: Record<number, SubscriptionStatus> = {
      0: 'pending',
      1: 'active',
      2: 'cancelled',
      3: 'expired',
    }
    if (v in map) return map[v as keyof typeof map]
  }
  const s = String(v ?? '').toLowerCase()
  if (s === 'active' || s === 'pending' || s === 'cancelled' || s === 'expired') return s
  if (s === 'inactive' || s === 'canceled') return 'cancelled'
  return 'pending'
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

  const directArrays = [
    o.result,
    o.Result,
    o.data,
    o.Data,
    o.items,
    o.Items,
    o.results,
    o.Results,
    o.organizations,
    o.Organizations,
    o.organization,
    o.Organization,
    o.clients,
    o.Clients,
    o.values,
    o.Values,
  ]
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
    'organizations',
    'Organizations',
    'organizationList',
    'OrganizationList',
    'clients',
    'Clients',
    'rows',
    'Rows',
    'records',
    'Records',
    'content',
    'Content',
    'values',
    'Values',
    'value',
    'Value',
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

/** Id de solicitud de suscripción: directo en la raíz o dentro de un objeto anidado. */
function pickSubscriptionRequestId(o: Record<string, unknown>): string | undefined {
  const direct = pick(o, [
    'subscriptionRequestId',
    'SubscriptionRequestId',
    'requestId',
    'RequestId',
    'pendingRequestId',
    'PendingRequestId',
  ])
  if (direct) return direct
  const nestedKeys = [
    'subscriptionRequest',
    'SubscriptionRequest',
    'pendingRequest',
    'PendingRequest',
    'subscriptionRequestDto',
    'SubscriptionRequestDto',
  ]
  for (const k of nestedKeys) {
    const n = asRecord(o[k])
    if (n) {
      const id = pick(n, ['id', 'Id'])
      if (id) return id
    }
  }
  return undefined
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

  const businessName =
    pick(o, ['businessName', 'BusinessName']) ||
    pick(o, ['organizationName', 'OrganizationName']) ||
    (org ? pick(org, ['name', 'Name', 'businessName', 'BusinessName', 'displayName', 'DisplayName']) : '') ||
    '—'

  const contactEmail =
    pick(o, ['contactEmail', 'ContactEmail']) ||
    (org ? pick(org, ['email', 'Email', 'contactEmail', 'ContactEmail']) : '') ||
    ''

  const contactPhone =
    pick(o, ['contactPhone', 'ContactPhone']) ||
    (org ? pick(org, ['phone', 'Phone', 'contactPhone', 'ContactPhone']) : '') ||
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

  const requestId = pickSubscriptionRequestId(o) || undefined

  return {
    id: pick(o, ['id', 'Id'], '0'),
    businessName,
    contactEmail,
    contactPhone,
    plan,
    planName: planName || undefined,
    planId: planId || undefined,
    requestId: requestId || undefined,
    status: normalizeStatus(
      o.status ?? o.Status ?? o.subscriptionStatus ?? o.SubscriptionStatus
    ),
    paymentMethod: null,
    amount,
    startsAt:
      pick(o, ['startsAt', 'StartsAt', 'startDate', 'StartDate', 'start', 'Start']) || null,
    expiresAt:
      pick(o, ['expiresAt', 'ExpiresAt', 'endDate', 'EndDate', 'expiresOn', 'ExpiresOn', 'end', 'End']) ||
      null,
    notes: pick(o, ['notes', 'Notes']) || null,
    createdAt: pick(o, ['createdAt', 'CreatedAt', 'created', 'Created']) || new Date().toISOString(),
  }
}

export interface SubscriptionRequestRow {
  id: string
  businessName: string
  contactEmail: string
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

  const businessName =
    pick(o, ['businessName', 'BusinessName']) ||
    (org ? pick(org, ['name', 'Name', 'displayName', 'DisplayName']) : '') ||
    '—'

  const contactEmail =
    pick(o, ['contactEmail', 'ContactEmail']) ||
    (org ? pick(org, ['email', 'Email']) : '') ||
    ''

  const planLabel =
    (plan ? pick(plan, ['displayName', 'DisplayName', 'name', 'Name']) : '') ||
    pick(o, ['planName', 'PlanName']) ||
    pick(o, ['planId', 'PlanId']) ||
    '—'

  return {
    id: pick(o, ['id', 'Id'], '0'),
    businessName,
    contactEmail,
    status: String(o.status ?? o.Status ?? ''),
    planLabel,
    createdAt: pick(o, ['createdAt', 'CreatedAt']) || '',
    raw: o,
  }
}

function isPendingSubscriptionRequestRow(r: SubscriptionRequestRow): boolean {
  const s = String(r.status ?? '').toLowerCase().trim()
  if (!s) return false
  if (s === 'pending' || s === '0' || s === 'waiting' || s === 'submitted' || s === 'new') return true
  if (s.includes('pending') || s.includes('pendiente')) return true
  return false
}

/**
 * Cuando GET /subscription no incluye el id de solicitud, enlaza filas pendientes
 * con GET /subscription/requests (mismo subscriptionId o mismo email de contacto).
 */
export function attachPendingRequestIds(
  subs: Subscription[],
  requests: SubscriptionRequestRow[]
): Subscription[] {
  const pending = requests.filter(isPendingSubscriptionRequestRow)
  const used = new Set<string>()

  return subs.map((s) => {
    if (s.status !== 'pending' || s.requestId) return s

    const bySubId = pending.find((r) => {
      if (used.has(r.id)) return false
      const sid =
        r.raw['subscriptionId'] ??
        r.raw['SubscriptionId'] ??
        r.raw['subscriptionID']
      return sid != null && String(sid) === s.id
    })
    if (bySubId) {
      used.add(bySubId.id)
      return { ...s, requestId: bySubId.id }
    }

    const email = s.contactEmail?.toLowerCase().trim()
    if (!email) return s

    const byEmail = pending.find((r) => {
      if (used.has(r.id)) return false
      const re = r.contactEmail?.toLowerCase().trim()
      return !!re && re === email
    })
    if (byEmail) {
      used.add(byEmail.id)
      return { ...s, requestId: byEmail.id }
    }

    return s
  })
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
  const durationDays = pickNum(o, ['durationDays', 'DurationDays', 'duration', 'Duration'])
  const maxProducts = pickNum(o, ['maxProducts', 'MaxProducts', 'productLimit', 'ProductLimit'])

  const displayName = pick(o, ['displayName', 'DisplayName'])
  const slugName = pick(o, ['name', 'Name'], 'Plan')
  const name = displayName || slugName

  return {
    id,
    name,
    price,
    /** 0 = la API no envía duración en días (mostrar "—" en la tabla) */
    durationDays: durationDays > 0 ? durationDays : 0,
    productLimit: Number.isFinite(maxProducts) ? maxProducts : 0,
    createdAt: pick(o, ['createdAt', 'CreatedAt']) || '',
    updatedAt: pick(o, ['updatedAt', 'UpdatedAt']) || '',
    priceHistory: [],
    isActive: o.isActive === true || o.IsActive === true || o.active === true || o.Active === true,
  }
}

function pickUserEmail(u: Record<string, unknown>): string {
  return pick(u, [
    'email',
    'Email',
    'userEmail',
    'UserEmail',
    'mail',
    'Mail',
    'emailAddress',
    'EmailAddress',
    'userName',
    'UserName',
  ])
}

function pickUserPhone(u: Record<string, unknown>): string {
  return pick(u, [
    'phone',
    'Phone',
    'mobile',
    'Mobile',
    'telephone',
    'Telephone',
    'cellPhone',
    'CellPhone',
    'phoneNumber',
    'PhoneNumber',
  ])
}

function firstUserFromArray(arr: unknown): Record<string, unknown> | null {
  if (!Array.isArray(arr) || arr.length === 0) return null
  return asRecord(arr[0])
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
    'user',
    'User',
    'contact',
    'Contact',
    'responsible',
    'Responsible',
    'representative',
    'Representative',
  ]
  for (const k of directKeys) {
    const r = asRecord(o[k])
    if (r && Object.keys(r).length) return r
  }
  const userArrays = [o.users ?? o.Users, o.members ?? o.Members, o.organizationUsers ?? o.OrganizationUsers]
  for (const users of userArrays) {
    if (!Array.isArray(users)) continue
    for (const u of users) {
      const ur = asRecord(u)
      if (!ur) continue
      const role = String(ur.role ?? ur.Role ?? ur.roleName ?? ur.RoleName ?? '').toLowerCase()
      if (
        role.includes('admin') ||
        role.includes('owner') ||
        role.includes('org') ||
        role.includes('manager')
      ) {
        return ur
      }
    }
    const first = firstUserFromArray(users)
    if (first) return first
  }
  return null
}

function findAdminUserMerged(o: Record<string, unknown>): Record<string, unknown> | null {
  const fromRoot = findAdminUser(o)
  if (fromRoot) return fromRoot

  const nestedOrg = asRecord(o.organization ?? o.Organization ?? o.org ?? o.Org)
  if (nestedOrg) {
    const fromNested = findAdminUser(nestedOrg)
    if (fromNested) return fromNested
    const nestedContact = asRecord(
      nestedOrg.contact ?? nestedOrg.Contact ?? nestedOrg.contactInfo ?? nestedOrg.ContactInfo
    )
    if (nestedContact) {
      const fromContact = findAdminUser(nestedContact)
      if (fromContact) return fromContact
    }
  }

  const rootContact = asRecord(o.contact ?? o.Contact ?? o.contactInfo ?? o.ContactInfo)
  if (rootContact) {
    const fromRc = findAdminUser(rootContact)
    if (fromRc) return fromRc
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

const ORG_NAME_KEYS = [
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
] as const

const ORG_EMAIL_KEYS = [
  'email',
  'Email',
  'contactEmail',
  'ContactEmail',
  'mail',
  'Mail',
  'primaryEmail',
  'PrimaryEmail',
  'userEmail',
  'UserEmail',
] as const

const ORG_PHONE_KEYS = [
  'phone',
  'Phone',
  'contactPhone',
  'ContactPhone',
  'mobile',
  'Mobile',
  'telephone',
  'Telephone',
  'cellPhone',
  'CellPhone',
  'phoneNumber',
  'PhoneNumber',
] as const

function pickFromRecord(r: Record<string, unknown>, keys: readonly string[]): string {
  return pick(r, [...keys])
}

export function normalizeOrganizationRow(raw: unknown): OrganizationClientRow {
  const o = asRecord(unwrapApiEntity(raw)) ?? asRecord(raw) ?? {}
  const nestedOrg = asRecord(o.organization ?? o.Organization ?? o.org ?? o.Org)
  const rootContact = asRecord(o.contact ?? o.Contact ?? o.contactInfo ?? o.ContactInfo)
  const nestedContact = nestedOrg
    ? asRecord(nestedOrg.contact ?? nestedOrg.Contact ?? nestedOrg.contactInfo ?? nestedOrg.ContactInfo)
    : null

  const admin = findAdminUserMerged(o)

  const organizationName =
    pickFromRecord(o, ORG_NAME_KEYS) ||
    (nestedOrg ? pickFromRecord(nestedOrg, ORG_NAME_KEYS) : '') ||
    '—'

  const orgEmail =
    pickFromRecord(o, ORG_EMAIL_KEYS) ||
    (nestedOrg ? pickFromRecord(nestedOrg, ORG_EMAIL_KEYS) : '') ||
    (rootContact ? pickFromRecord(rootContact, ORG_EMAIL_KEYS) : '') ||
    (nestedContact ? pickFromRecord(nestedContact, ORG_EMAIL_KEYS) : '')

  const orgPhone =
    pickFromRecord(o, ORG_PHONE_KEYS) ||
    (nestedOrg ? pickFromRecord(nestedOrg, ORG_PHONE_KEYS) : '') ||
    (rootContact ? pickFromRecord(rootContact, ORG_PHONE_KEYS) : '') ||
    (nestedContact ? pickFromRecord(nestedContact, ORG_PHONE_KEYS) : '')

  const adminName = admin
    ? pick(admin, [
        'fullName',
        'FullName',
        'name',
        'Name',
        'displayName',
        'DisplayName',
        'userName',
        'UserName',
      ])
    : ''
  const adminEmail = admin ? pickUserEmail(admin) : ''
  const adminPhone = admin ? pickUserPhone(admin) : ''

  const statusRaw = o.status ?? o.Status ?? o.accountStatus ?? o.AccountStatus ?? o.state ?? o.State
  const nestedStatus =
    nestedOrg &&
    (nestedOrg.status ?? nestedOrg.Status ?? nestedOrg.accountStatus ?? nestedOrg.AccountStatus)
  const accountStatus = normalizeOrgAccountStatus(
    o.isActive === false || o.IsActive === false
      ? 'inactive'
      : nestedOrg && (nestedOrg.isActive === false || nestedOrg.IsActive === false)
        ? 'inactive'
        : statusRaw ?? nestedStatus
  )

  const createdAt =
    pick(o, ['createdAt', 'CreatedAt', 'created', 'Created']) ||
    (nestedOrg ? pick(nestedOrg, ['createdAt', 'CreatedAt', 'created', 'Created']) : '') ||
    ''

  return {
    id: pick(o, ['id', 'Id'], '0'),
    organizationName,
    email: orgEmail || adminEmail || '',
    phone: orgPhone || adminPhone || '',
    accountStatus,
    adminName: adminName || '—',
    adminEmail: adminEmail || '—',
    createdAt,
  }
}

export function normalizeOrganizationDetail(raw: unknown): OrganizationDetail {
  const row = normalizeOrganizationRow(raw)
  const o = asRecord(unwrapApiEntity(raw)) ?? asRecord(raw) ?? {}
  const admin = findAdminUserMerged(o)
  return {
    ...row,
    adminPhone: admin ? pickUserPhone(admin) || undefined : undefined,
    raw: o,
  }
}
