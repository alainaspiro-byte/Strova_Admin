'use server'

import fs from 'fs'
import path from 'path'
import type { WhatsAppMessageTemplate } from '@/lib/whatsapp-templates'

const REL = ['src', 'data', 'whatsapp-templates.json'] as const

function templatesFilePath(): string {
  return path.join(process.cwd(), ...REL)
}

export async function readWhatsAppTemplates(): Promise<WhatsAppMessageTemplate[]> {
  const fp = templatesFilePath()
  const raw = fs.readFileSync(fp, 'utf8')
  const data = JSON.parse(raw) as unknown
  if (!Array.isArray(data)) {
    throw new Error('whatsapp-templates.json debe ser un array')
  }
  return data as WhatsAppMessageTemplate[]
}

export async function saveWhatsAppTemplates(
  templates: WhatsAppMessageTemplate[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    for (const t of templates) {
      if (!t.id?.trim() || !t.name?.trim() || !t.body?.trim()) {
        return { ok: false, error: 'Cada plantilla requiere id, nombre y cuerpo.' }
      }
    }
    const fp = templatesFilePath()
    const json = `${JSON.stringify(templates, null, 2)}\n`
    fs.writeFileSync(fp, json, 'utf8')
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar'
    return { ok: false, error: msg }
  }
}
