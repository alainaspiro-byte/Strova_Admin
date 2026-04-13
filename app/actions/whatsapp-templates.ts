'use server'

import fs from 'fs'
import path from 'path'
import type { WhatsAppMessageTemplate } from '@/lib/whatsapp-templates'

const REL_SRC = ['src', 'data', 'whatsapp-templates.json'] as const
const REL_PUBLIC = ['public', 'whatsapp-templates.json'] as const

function templatesSrcPath(): string {
  return path.join(process.cwd(), ...REL_SRC)
}

function templatesPublicPath(): string {
  return path.join(process.cwd(), ...REL_PUBLIC)
}

export async function saveWhatsAppTemplates(
  templates: WhatsAppMessageTemplate[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.NODE_ENV === 'production') {
    return {
      ok: false,
      error:
        'En producción las plantillas son fijas. Edita public/whatsapp-templates.json en el repositorio y vuelve a desplegar.',
    }
  }
  try {
    for (const t of templates) {
      if (!t.id?.trim() || !t.name?.trim() || !t.body?.trim()) {
        return { ok: false, error: 'Cada plantilla requiere id, nombre y cuerpo.' }
      }
    }
    const json = `${JSON.stringify(templates, null, 2)}\n`
    fs.writeFileSync(templatesSrcPath(), json, 'utf8')
    fs.writeFileSync(templatesPublicPath(), json, 'utf8')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar'
    return { ok: false, error: msg }
  }
}
