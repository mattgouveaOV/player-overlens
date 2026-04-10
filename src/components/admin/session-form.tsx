'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RoomsList } from './rooms-list'
import { copy } from '@/lib/copy'

interface RoomInput {
  id: string // local temp id
  name: string
  description: string
  anchor_prompt: string
  max_members: number
  cover_url: string
  sort_order: number
}

interface SessionFormProps {
  sessionId?: string // undefined = novo
  initialData?: {
    title: string
    scheduled_at: string
    duration_minutes: number
    rooms: RoomInput[]
  }
}

export function SessionForm({ sessionId, initialData }: SessionFormProps) {
  const router = useRouter()
  const isNew = !sessionId

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [scheduledAt, setScheduledAt] = useState(
    initialData?.scheduled_at
      ? new Date(initialData.scheduled_at).toISOString().slice(0, 16)
      : ''
  )
  const [durationMinutes, setDurationMinutes] = useState(
    initialData?.duration_minutes ?? 90
  )
  const [rooms, setRooms] = useState<RoomInput[]>(initialData?.rooms ?? [])
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  function validate(): string[] {
    const errors: string[] = []
    if (!title.trim()) errors.push('Título é obrigatório')
    if (!scheduledAt) errors.push('Data e hora são obrigatórios')
    if (scheduledAt && new Date(scheduledAt) <= new Date()) {
      errors.push(copy.admin.validation.futureDate)
    }
    if (rooms.length === 0) errors.push(copy.admin.validation.minOneRoom)
    for (const room of rooms) {
      if (!room.anchor_prompt.trim()) {
        errors.push(`${copy.admin.validation.anchorRequired}: "${room.name || 'Sem nome'}"`)
      }
    }
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])
    setSaving(true)

    const payload = {
      title: title.trim(),
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: durationMinutes,
      mode: 'player',
      rooms: rooms.map((r, i) => ({ ...r, sort_order: i })),
    }

    const url = isNew ? '/api/admin/sessions' : `/api/admin/sessions/${sessionId}`
    const method = isNew ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Player-Client': '1' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/admin/sessions/${data.id ?? sessionId}`)
    } else {
      const err = await res.json().catch(() => ({}))
      setValidationErrors([err.error ?? 'Erro ao salvar'])
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Erros de validação */}
      {validationErrors.length > 0 && (
        <div className="bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 rounded-lg p-4">
          <ul className="space-y-1">
            {validationErrors.map((e, i) => (
              <li key={i} className="text-xs text-[var(--brand-red)]">· {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dados da sessão */}
      <section className="space-y-4">
        <h2 className="font-display text-sm uppercase tracking-wide text-[var(--text-muted)]">
          Encontro
        </h2>

        <Field label={copy.admin.fields.title}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Atravessamentos — Abril 2026"
            required
            className="input-base"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={copy.admin.fields.scheduledAt}>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              required
              className="input-base"
            />
          </Field>
          <Field label={copy.admin.fields.durationMinutes}>
            <input
              type="number"
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              min={15}
              max={480}
              className="input-base"
            />
          </Field>
        </div>
      </section>

      {/* Salas */}
      <section className="space-y-4">
        <h2 className="font-display text-sm uppercase tracking-wide text-[var(--text-muted)]">
          Salas
        </h2>
        <RoomsList rooms={rooms} onChange={setRooms} />
      </section>

      {/* Ações */}
      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : isNew ? copy.admin.publish : copy.admin.saveDraft}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      {children}
      <style>{`
        .input-base {
          background: var(--surface-1);
          border: 1px solid rgb(63 63 70);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--text-primary);
          outline: none;
          width: 100%;
        }
        .input-base:focus {
          border-color: rgb(113 113 122);
        }
        .input-base::placeholder {
          color: var(--text-subtle);
        }
      `}</style>
    </label>
  )
}
