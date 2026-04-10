import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionForm } from '@/components/admin/session-form'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditSessionPage({ params }: Props) {
  const { id: sessionId } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .schema('mentorados')
    .from('study_sessions')
    .select('id, title, status, scheduled_at, duration_minutes, mode')
    .eq('id', sessionId)
    .single()

  if (!session || (session as { mode?: string }).mode !== 'player') notFound()

  const { data: rooms } = await supabase
    .schema('mentorados')
    .from('study_rooms')
    .select('id, name, description, anchor_prompt, cover_url, max_members, sort_order')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  const isLive = session.status === 'live'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl uppercase tracking-tight text-[var(--text-primary)]">
          {session.title}
        </h1>
        <div className="flex items-center gap-3">
          {isLive && (
            <Link
              href={`/admin/sessions/${sessionId}/monitor`}
              className="text-sm text-[var(--brand-green)] border border-[var(--brand-green)]/30 px-3 py-1.5 rounded-lg hover:bg-[var(--brand-green)]/10 transition-colors"
            >
              Monitor ao vivo →
            </Link>
          )}
          <Link
            href={`/admin/sessions/${sessionId}/dry-run`}
            className="text-sm text-[var(--text-muted)] border border-zinc-700 px-3 py-1.5 rounded-lg hover:border-zinc-500 transition-colors"
          >
            Testar fluxo
          </Link>
        </div>
      </div>

      <SessionForm
        sessionId={sessionId}
        initialData={{
          title: session.title,
          scheduled_at: session.scheduled_at,
          duration_minutes: (session as { duration_minutes?: number }).duration_minutes ?? 90,
          rooms: (rooms ?? []).map(r => ({
            id: r.id,
            name: r.name,
            description: r.description ?? '',
            anchor_prompt: (r as { anchor_prompt?: string }).anchor_prompt ?? '',
            max_members: r.max_members ?? 8,
            cover_url: (r as { cover_url?: string }).cover_url ?? '',
            sort_order: r.sort_order ?? 0,
          })),
        }}
      />
    </div>
  )
}
