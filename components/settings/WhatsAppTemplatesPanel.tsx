'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  WHATSAPP_TEMPLATE_VARIABLE_TOKENS,
  fetchWhatsAppTemplates,
  previewTemplateBodyWithExamples,
  type WhatsAppMessageTemplate,
} from '@/lib/whatsapp-templates'
import { saveWhatsAppTemplates } from '@/app/actions/whatsapp-templates'

const templatesLocked = process.env.NODE_ENV === 'production'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500'
const cardShell =
  'bg-white dark:bg-[#1a2332] rounded-lg border border-slate-200 shadow-sm dark:border-white/[0.08] dark:shadow-none overflow-hidden'
const modalOverlay = 'fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4'
const modalBox =
  'bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl dark:shadow-none space-y-4'

function newTemplateId(): string {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function WhatsAppTemplatesPanel() {
  const [items, setItems] = useState<WhatsAppMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppMessageTemplate | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBody, setFormBody] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await fetchWhatsAppTemplates()
      setItems(list)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'No se pudieron cargar las plantillas')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormDescription('')
    setFormBody('')
    setSaveError(null)
    setEditorOpen(true)
  }

  const openEdit = (t: WhatsAppMessageTemplate) => {
    setEditing(t)
    setFormName(t.name)
    setFormDescription(t.description)
    setFormBody(t.body)
    setSaveError(null)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
    setSaveError(null)
  }

  const insertVariable = (token: string) => {
    const ta = bodyRef.current
    if (!ta) {
      setFormBody((b) => b + token)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = formBody.slice(0, start) + token + formBody.slice(end)
    setFormBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + token.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const previewLive = useMemo(() => previewTemplateBodyWithExamples(formBody), [formBody])

  const persist = async (next: WhatsAppMessageTemplate[]) => {
    if (templatesLocked) return false
    setSaving(true)
    setSaveError(null)
    const res = await saveWhatsAppTemplates(next)
    setSaving(false)
    if (!res.ok) {
      setSaveError(res.error)
      return false
    }
    setItems(next)
    return true
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (templatesLocked) return
    const name = formName.trim()
    const description = formDescription.trim()
    const body = formBody
    if (!name || !body.trim()) {
      setSaveError('Nombre y mensaje son obligatorios.')
      return
    }
    const id = editing?.id ?? newTemplateId()
    const row: WhatsAppMessageTemplate = { id, name, description, body }
    const next = editing
      ? items.map((x) => (x.id === editing.id ? row : x))
      : [...items, row]
    if (await persist(next)) closeEditor()
  }

  const handleDelete = async (id: string) => {
    if (templatesLocked) return
    if (!confirm('¿Eliminar esta plantilla?')) return
    const next = items.filter((x) => x.id !== id)
    await persist(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-white/50 max-w-xl">
          {templatesLocked ? (
            <>
              Plantillas servidas desde{' '}
              <code className="text-xs text-slate-500 dark:text-white/40">public/whatsapp-templates.json</code> (solo
              lectura en producción). Para cambiarlas, edita ese archivo en el repositorio y despliega de nuevo.
            </>
          ) : (
            <>
              Edita los mensajes predefinidos para WhatsApp. Al guardar se actualizan{' '}
              <code className="text-xs text-slate-500 dark:text-white/40">public/whatsapp-templates.json</code> y{' '}
              <code className="text-xs text-slate-500 dark:text-white/40">src/data/whatsapp-templates.json</code>.
            </>
          )}
        </p>
        {!templatesLocked && (
          <button
            type="button"
            onClick={openCreate}
            className="shrink-0 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Nueva plantilla
          </button>
        )}
      </div>

      {templatesLocked && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200/90">
          Modo producción: no se pueden crear, editar ni eliminar plantillas desde el panel.
        </div>
      )}

      {loadError && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>{loadError}</span>
          <button type="button" onClick={() => reload()} className="text-xs underline">
            Reintentar
          </button>
        </div>
      )}

      <div className={cardShell}>
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-white/40">
            Cargando plantillas…
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-white/40">
            No hay plantillas. Crea una con &quot;Nueva plantilla&quot;.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {items.map((t) => (
              <li key={t.id} className="px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-slate-500 dark:text-white/45 mt-0.5">{t.description || '—'}</div>
                  <p
                    className="mt-2 text-xs text-slate-400 dark:text-white/35 line-clamp-2 whitespace-pre-wrap break-words"
                    title={t.body}
                  >
                    {t.body}
                  </p>
                </div>
                {!templatesLocked && (
                  <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="text-sm text-red-600 hover:text-red-500 dark:text-red-400 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editorOpen && (
        <div className={modalOverlay} role="dialog" aria-modal="true">
          <div className={modalBox}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Editar plantilla' : 'Nueva plantilla'}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] dark:hover:text-white"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {saveError && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-white/50 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-white/50 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-white/50 mb-1">Mensaje</label>
                <textarea
                  ref={bodyRef}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={8}
                  className={`${inputClass} font-mono text-sm resize-y min-h-[140px]`}
                  required
                />
                <div className="mt-2">
                  <p className="text-[11px] text-slate-500 dark:text-white/40 mb-1.5">Variables (clic para insertar)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WHATSAPP_TEMPLATE_VARIABLE_TOKENS.map((tok) => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => insertVariable(tok)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-white/10 dark:border-white/[0.08] dark:text-emerald-300/90 dark:hover:bg-white/[0.14]"
                      >
                        {tok}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#111827] p-3">
                <p className="text-[11px] font-medium text-slate-500 dark:text-white/45 mb-1">Vista previa (ejemplo)</p>
                <p className="text-sm text-slate-700 dark:text-white/80 whitespace-pre-wrap break-words">{previewLive}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || templatesLocked}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {templatesLocked ? 'Solo lectura' : saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeEditor}
                  className="flex-1 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-800 dark:bg-[#111827] dark:border-white/[0.08] dark:text-white rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
