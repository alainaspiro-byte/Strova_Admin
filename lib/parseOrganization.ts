import type { OrganizationEntity, OrganizationLocation } from './organizationApiTypes'
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

function pickBool(o: Record<string, unknown>, keys: string[]): boolean {
  for (const k of keys) {
    const v = o[k]
    if (v === true || v === 'true') return true
    if (v === false || v === 'false') return false
  }
  return false
}

function pickNullableStr(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k]
    if (v === undefined || v === null) continue
    const s = String(v).trim()
    return s === '' ? null : s
  }
  return null
}

function parseBusinessCategory(
  raw: unknown
): { name: string; icon: string } | null {
  const o = asRecord(raw)
  if (!o) return null
  const name = pickStr(o, ['name', 'Name'], '')
  const icon = pickStr(o, ['icon', 'Icon'], '')
  if (!name && !icon) return null
  return { name: name || '—', icon: icon || '' }
}

function parseLocation(raw: unknown): OrganizationLocation {
  const o = asRecord(raw) ?? {}
  const bcRaw = o.businessCategory ?? o.BusinessCategory
  return {
    id: pickNum(o, ['id', 'Id'], 0),
    organizationId: pickNum(o, ['organizationId', 'OrganizationId'], 0),
    organizationName: pickStr(o, ['organizationName', 'OrganizationName'], ''),
    name: pickStr(o, ['name', 'Name'], '—'),
    code: pickStr(o, ['code', 'Code'], ''),
    description: pickNullableStr(o, ['description', 'Description']),
    whatsAppContact: pickNullableStr(o, ['whatsAppContact', 'WhatsAppContact']),
    photoUrl: pickNullableStr(o, ['photoUrl', 'PhotoUrl']),
    province: pickNullableStr(o, ['province', 'Province']),
    municipality: pickNullableStr(o, ['municipality', 'Municipality']),
    street: pickNullableStr(o, ['street', 'Street']),
    businessHours: pickNullableStr(o, ['businessHours', 'BusinessHours']),
    coordinates: pickNullableStr(o, ['coordinates', 'Coordinates']),
    isOpenNow: pickBool(o, ['isOpenNow', 'IsOpenNow']),
    isVerified: pickBool(o, ['isVerified', 'IsVerified']),
    offersDelivery: pickBool(o, ['offersDelivery', 'OffersDelivery']),
    offersPickup: pickBool(o, ['offersPickup', 'OffersPickup']),
    businessCategoryId: (() => {
      const v = o.businessCategoryId ?? o.BusinessCategoryId
      if (v === undefined || v === null || v === '') return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : null
    })(),
    businessCategory: parseBusinessCategory(bcRaw),
    createdAt: pickStr(o, ['createdAt', 'CreatedAt'], ''),
    modifiedAt: pickStr(o, ['modifiedAt', 'ModifiedAt'], ''),
  }
}

export function parseOrganization(raw: unknown): OrganizationEntity {
  const o = asRecord(unwrapApiEntity(raw)) ?? asRecord(raw) ?? {}
  const locRaw = o.locations ?? o.Locations
  const locations: OrganizationLocation[] = Array.isArray(locRaw)
    ? locRaw.map((x) => parseLocation(x))
    : []

  return {
    id: pickNum(o, ['id', 'Id'], 0),
    name: pickStr(o, ['name', 'Name'], '—'),
    code: pickStr(o, ['code', 'Code'], ''),
    description: pickNullableStr(o, ['description', 'Description']),
    isVerified: o.isVerified === true || o.IsVerified === true,
    createdAt: pickStr(o, ['createdAt', 'CreatedAt'], ''),
    modifiedAt: pickStr(o, ['modifiedAt', 'ModifiedAt'], ''),
    locations,
  }
}
