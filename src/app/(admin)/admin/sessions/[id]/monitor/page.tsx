import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MonitorView } from '@/components/admin/monitor-view'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MonitorPage({ params }: Props) {
  const { id: sessionId } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .schema('mentorados')
    .from('study_sessions')
    .select('id, title, status, scheduled_at')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  const { data: rooms } = await supabase
    .schema('mentorados')
    .from('study_rooms')
    .select('id, name, max_members, sort_order')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  const { data: presenceRows } = await supabase
    .schema('mentorados')
    .from('study_presence')
    .select('room_id, user_id, joined_at, left_at')
    .in('room_id', (rooms ?? []).map(r => r.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-tight text-[var(--text-primary)] mb-1">
            Monitor
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{session.title}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${
          session.status === 'live'
            ? 'bg-[var(--brand-green)]/15 text-[var(--brand-green)] border-[var(--brand-green)]/30'
            : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-zinc-700'
        }`}>
          {session.status === 'live' ? 'Ao vivo' : session.status}
        </span>
      </div>

      <MonitorView
        sessionId={sessionId}
        rooms={(rooms ?? []).map(r => ({
          id: r.id,
          name: r.name,
          max_members: r.max_members ?? 0,
        }))}
        presenceRows={presenceRows ?? []}
      />
    </div>
  )
}
