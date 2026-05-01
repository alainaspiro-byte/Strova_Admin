/**
 * Formato monetario para Tesoreria. Moneda: CUP, sin decimales.
 * Centralizado para que cards, tablas, formularios y CSV se mantengan
 * consistentes.
 */

/**
 * Devuelve el monto en formato `$X,XXX CUP` (sin decimales).
 * Negativos: `-$X,XXX CUP`.
 */
export function formatCup(value: number): string {
  if (!Number.isFinite(value)) return '$0 CUP'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(Math.round(value))
  return `${sign}$${abs.toLocaleString('en-US')} CUP`
}

/**
 * Misma representacion pero solo numero (para inputs / CSV).
 * Ej. 2500 -> "2500".
 */
export function cupNumberString(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.round(value))
}

/**
 * Util de comparacion para detectar si un monto manual coincide con el del plan.
 * Tolera diferencias menores a 1 CUP.
 */
export function amountsMatch(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return Math.abs(Math.round(a) - Math.round(b)) < 1
}
