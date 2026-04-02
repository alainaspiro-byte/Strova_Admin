import type { ApiUserDetail } from './organizationApiTypes'
import { unwrapApiEntity } from './mappers'

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
      const n = Number(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return fallback
}

function phoneNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

export function parseApiUser(raw: unknown): ApiUserDetail {
  const o = asRecord(unwrapApiEntity(raw)) ?? asRecord(raw) ?? {}
  return {
    id: pickNum(o, ['id', 'Id'], 0),
    fullName: pickStr(o, ['fullName', 'FullName'], '—'),
    email: pickStr(o, ['email', 'Email'], ''),
    phone: phoneNull(o.phone ?? o.Phone),
    status: pickNum(o, ['status', 'Status'], 0),
    createdAt: pickStr(o, ['createdAt', 'CreatedAt'], ''),
    organizationId: pickNum(o, ['organizationId', 'OrganizationId'], 0),
    roleId: pickNum(o, ['roleId', 'RoleId'], 0),
  }
}
