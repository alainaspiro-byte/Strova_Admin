import type { ApiSubscription } from '@/lib/subscriptionApiTypes'

export interface WhatsAppMessageTemplate {
  id: string
  name: string
  description: string
  body: string
}

/** Placeholders soportados en el JSON (chips y sustitución). */
export const WHATSAPP_TEMPLATE_VARIABLE_TOKENS = [
  '{nombre}',
  '{plan}',
  '{fechaVencimiento}',
  '{diasRestantes}',
] as const

export type WhatsAppTemplateVariableToken = (typeof WHATSAPP_TEMPLATE_VARIABLE_TOKENS)[number]

const VAR_RE = /\{nombre\}|\{plan\}|\{fechaVencimiento\}|\{diasRestantes\}/g

export function formatFechaVencimientoPlantilla(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/** Valores fijos para el preview en Configuración (plantillas). */
export const WHATSAPP_TEMPLATE_EXAMPLE_VALUES: Record<
  WhatsAppTemplateVariableToken,
  string
> = {
  '{nombre}': 'Juan García',
  '{plan}': 'Pro',
  '{fechaVencimiento}': '30 abr 2026',
  '{diasRestantes}': '7',
}

export function previewTemplateBodyWithExamples(body: string): string {
  let out = body
  for (const token of WHATSAPP_TEMPLATE_VARIABLE_TOKENS) {
    out = out.split(token).join(WHATSAPP_TEMPLATE_EXAMPLE_VALUES[token])
  }
  return out
}

/**
 * Sustituye en `body` los tokens `{nombre}`, `{plan}`, `{fechaVencimiento}` y `{diasRestantes}`.
 *
 * Variables disponibles y origen en el modal de detalle de organización (`OrganizationsTable`):
 * - `{nombre}`: texto de contacto del admin de la suscripción prioritaria de la org
 *   (`ApiSubscription.adminContact.fullName`, mismo origen que el botón WA del footer).
 * - `{plan}`: nombre legible del plan (`ApiSubscription.plan.displayName`).
 * - `{fechaVencimiento}`: fecha de fin de suscripción (`ApiSubscription.endDate`, ISO de la API)
 *   formateada en español con `formatFechaVencimientoPlantilla`.
 * - `{diasRestantes}`: campo numérico `ApiSubscription.daysRemaining` devuelto por la API.
 *
 * `detailSub` proviene de `subscriptionMap.get(org.id)` (suscripción prioritaria por organización).
 */
export function applyWhatsappTemplateBodyForOrganizationDetail(
  body: string,
  subscription: ApiSubscription | null | undefined
): string {
  const nombre =
    subscription?.adminContact?.fullName?.trim() ||
    'Cliente'
  const plan = subscription?.plan?.displayName?.trim() || '—'
  const fechaVencimiento = formatFechaVencimientoPlantilla(subscription?.endDate)
  const diasRestantes =
    subscription != null && Number.isFinite(subscription.daysRemaining)
      ? String(subscription.daysRemaining)
      : '—'

  return body.replace(VAR_RE, (m) => {
    switch (m as WhatsAppTemplateVariableToken) {
      case '{nombre}':
        return nombre
      case '{plan}':
        return plan
      case '{fechaVencimiento}':
        return fechaVencimiento
      case '{diasRestantes}':
        return diasRestantes
      default:
        return m
    }
  })
}
