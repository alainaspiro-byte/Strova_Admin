import {
  ROLE_COOKIE_NAME,
  ROLE_STORAGE_KEY,
  SUPERADMIN_ROLE_ID_VALUE,
} from './authConstants'

export { SUPERADMIN_DENIED_MESSAGE } from './authConstants'

const ROLE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7

export function setSuperAdminRoleMarker(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ROLE_STORAGE_KEY, SUPERADMIN_ROLE_ID_VALUE)
  document.cookie = `${ROLE_COOKIE_NAME}=${SUPERADMIN_ROLE_ID_VALUE}; path=/; max-age=${ROLE_COOKIE_MAX_AGE_SEC}; SameSite=Lax`
}

export function clearSuperAdminRoleMarker(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ROLE_STORAGE_KEY)
  document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0`
}

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  clearSuperAdminRoleMarker()
}
