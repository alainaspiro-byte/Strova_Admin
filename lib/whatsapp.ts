/**
 * Dígitos para wa.me: ASCII 0-9 tras NFKC (p. ej. dígitos de ancho completo).
 * Opcional: NEXT_PUBLIC_WHATSAPP_DEFAULT_COUNTRY_CODE (solo dígitos, ej. 52) para
 * anteponer a números locales de 10 dígitos cuando la API no envía prefijo internacional.
 */
const WA_TEXT_MAX = 1200

function defaultCountryDigits(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_COUNTRY_CODE ?? ''
  return String(raw).replace(/\D/g, '')
}

/** Solo dígitos, listo para wa.me / api.whatsapp.com */
export function sanitizePhoneForWa(phone: string): string {
  return String(phone ?? '')
    .normalize('NFKC')
    .replace(/\D/g, '')
}

export function normalizeDigitsForWaMe(digits: string): string {
  if (!digits) return ''
  const cc = defaultCountryDigits()
  if (cc && digits.length === 10 && !digits.startsWith(cc)) {
    return `${cc}${digits}`
  }
  return digits
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const text =
    message.length > WA_TEXT_MAX ? `${message.slice(0, WA_TEXT_MAX - 1)}…` : message
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`
}
