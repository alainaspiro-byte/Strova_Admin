/** Cookie y localStorage para marcar sesión SuperAdmin (middleware sin llamar a la API en cada navegación). */
export const ROLE_COOKIE_NAME = 'strova_role_id'
export const ROLE_STORAGE_KEY = 'strovaRoleId'
export const SUPERADMIN_ROLE_ID_VALUE = '1'

export const SUPERADMIN_DENIED_MESSAGE =
  'No tienes permisos para acceder a este panel. Se requiere rol SuperAdmin.'
