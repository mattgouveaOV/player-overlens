import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DryRunPage({ params }: Props) {
  const { id: sessionId } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .schema('mentorados')
    .from('study_sessions')
    .select('id, title, scheduled_at')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  const { data: rooms } = await supabase
    .schema('mentorados')
    .from('study_rooms')
    .select('id, name')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-2xl uppercase tracking-tight text-[var(--text-primary)] mb-2">
        Testar fluxo
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Simule o fluxo do mentorado para este encontro. Use uma aba anônima para testar sem
        interferir nos dados reais.
      </p>

      <div className="bg-[var(--surface-1)] border border-zinc-800 rounded-xl p-6 space-y-4 mb-6">
        <p className="text-sm text-[var(--text-primary)]">{session.title}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {new Date(session.scheduled_at).toLocaleString('pt-BR', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}
        </p>
        <div className="border-t border-zinc-800 pt-4 space-y-2">
          <p className="text-xs text-[var(--text-subtle)] mb-2">Salas:</p>
          {(rooms ?? []).map(room => (
            <div key={room.id} className="flex items-center justify-between">
              <span className="text-xs font-display uppercase tracking-wide text-[var(--text-muted)]">
                {room.name}
              </span>
              <Link
                href={`/s/${sessionId}/r/${room.id}`}
                target="_blank"
                className="text-xs text-[var(--brand-amber)] hover:underline"
              >
                Testar →
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
          <strong className="text-[var(--text-muted)]">Checklist antes de publicar:</strong>
          <br />
          · Todos os nomes das salas são específicos e evitam genéricos (Sala 1, Principal, Geral)
          <br />
          · Todos os prompts-âncora estão preenchidos com uma frase concreta
          <br />
          · A capacidade de cada sala é adequada (esperado × 1.3)
          <br />
          · A data e hora estão corretas no fuso BRT
          <br />
          · Você testou entrar em pelo menos uma sala nesta tela
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Voltar para edição
        </Link>
        <Link
          href={`/s/${sessionId}`}
          target="_blank"
          className="text-sm text-[var(--brand-amber)] hover:underline"
        >
          Ver mapa completo →
        </Link>
      </div>
    </div>
  )
}
