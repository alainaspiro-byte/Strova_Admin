import type {
  ApiPlan,
  ApiSubscription,
  ApiSubscriptionAdminContact,
  ApiSubscriptionOrganization,
  ApiSubscriptionPlan,
  ApiSubscriptionStatus,
} from './subscriptionApiTypes'

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return null
}

function pickStr(o: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = o[k]
    if (v !== undefined && v !== null) return String(v)
  }
  return fallback
}

function pickNum(o: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return fallback
}

function parseAdminContact(raw: unknown): ApiSubscriptionAdminContact | null {
  const o = asRecord(raw)
  if (!o) return null
  return {
    userId: pickNum(o, ['userId', 'UserId'], 0),
    fullName: pickStr(o, ['fullName', 'FullName', 'name', 'Name'], '—'),
    phone: (() => {
      const p = o.phone ?? o.Phone
      if (p === undefined || p === null) return null
      const s = String(p).trim()
      return s === '' ? null : s
    })(),
  }
}

export function parseApiSubscription(raw: unknown): ApiSubscription {
  const o = asRecord(raw) ?? {}
  const plan = asRecord(o.plan ?? o.Plan) ?? {}
  const org = asRecord(o.organization ?? o.Organization) ?? {}
  const status = String(o.status ?? o.Status ?? 'pending').toLowerCase() as ApiSubscriptionStatus

  return {
    id: pickNum(o, ['id', 'Id'], 0),
    billingCycle:
      String(o.billingCycle ?? o.BillingCycle ?? 'monthly').toLowerCase() === 'annual'
        ? 'annual'
        : 'monthly',
    status: (['pending', 'active', 'rejected', 'cancelled', 'expired'].includes(status)
      ? status
      : 'pending') as ApiSubscriptionStatus,
    startDate: pickStr(o, ['startDate', 'StartDate', 'startsAt', 'StartsAt'], ''),
    endDate: pickStr(o, ['endDate', 'EndDate', 'expirationDate', 'ExpirationDate', 'expiresAt', 'ExpiresAt'], ''),
    daysRemaining: pickNum(o, ['daysRemaining', 'DaysRemaining', 'remainingDays', 'RemainingDays'], 0),
    plan: {
      id: pickNum(plan, ['id', 'Id'], 0),
      displayName: pickStr(plan, ['displayName', 'DisplayName', 'name', 'Name'], '—'),
      monthlyPrice: pickNum(plan, ['monthlyPrice', 'MonthlyPrice'], 0),
      annualPrice: pickNum(plan, ['annualPrice', 'AnnualPrice'], 0),
    },
    organization: {
      id: pickNum(org, ['id', 'Id'], 0),
      name: pickStr(org, ['name', 'Name'], '—'),
      code: pickStr(org, ['code', 'Code'], ''),
    },
    adminContact: parseAdminContact(o.adminContact ?? o.AdminContact),
  }
}

export function parseApiPlan(raw: unknown): ApiPlan {
  const o = asRecord(raw) ?? {}
  return {
    id: pickNum(o, ['id', 'Id'], 0),
    name: pickStr(o, ['name', 'Name'], ''),
    displayName: pickStr(o, ['displayName', 'DisplayName', 'name', 'Name'], '—'),
    monthlyPrice: pickNum(o, ['monthlyPrice', 'MonthlyPrice'], 0),
    annualPrice: pickNum(o, ['annualPrice', 'AnnualPrice'], 0),
    maxProducts: pickNum(o, ['maxProducts', 'MaxProducts', 'productLimit', 'ProductLimit'], 0),
    maxUsers: pickNum(o, ['maxUsers', 'MaxUsers'], 0),
    maxLocations: pickNum(o, ['maxLocations', 'MaxLocations'], 0),
    isActive: o.isActive === true || o.IsActive === true || o.active === true,
  }
}
