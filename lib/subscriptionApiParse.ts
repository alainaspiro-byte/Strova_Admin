import type { SubscriptionPagination } from './subscriptionApiTypes'

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return null
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return fallback
}

function bool(v: unknown): boolean {
  return v === true || v === 'true'
}

export function parsePagination(raw: unknown): SubscriptionPagination | null {
  const o = asRecord(raw)
  if (!o) return null
  return {
    currentPage: num(o.currentPage ?? o.CurrentPage, 1),
    totalPages: num(o.totalPages ?? o.TotalPages, 0),
    totalCount: num(o.totalCount ?? o.TotalCount, 0),
    pageSize: num(o.pageSize ?? o.PageSize, 10),
    hasPreviousPage: bool(o.hasPreviousPage ?? o.HasPreviousPage),
    hasNextPage: bool(o.hasNextPage ?? o.HasNextPage),
  }
}

/** Wrapper { result, pagination, statusCode } */
export function parseSubscriptionListResponse(raw: unknown): {
  items: unknown[]
  pagination: SubscriptionPagination | null
} {
  const o = asRecord(raw)
  if (!o) return { items: [], pagination: null }
  const result = o.result ?? o.Result
  const items = Array.isArray(result) ? result : []
  const pagination = parsePagination(o.pagination ?? o.Pagination)
  return { items, pagination }
}

export function parsePlanListResponse(raw: unknown): unknown[] {
  const o = asRecord(raw)
  if (!o) return []
  const result = o.result ?? o.Result
  if (Array.isArray(result)) return result
  if (Array.isArray(raw)) return raw as unknown[]
  return []
}

export function parseSubscriptionRequestsResponse(raw: unknown): unknown[] {
  return parseSubscriptionListResponse(raw).items
}
