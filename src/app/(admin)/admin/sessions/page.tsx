import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { copy } from '@/lib/copy'

export default async function AdminSessionsPage() {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .schema('mentorados')
    .from('study_sessions')
    .select('id, title, status, scheduled_at, mode')
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: false })
    .limit(30)

  const playerSessions = (sessions ?? []).filter(
    s => (s as { mode?: string }).mode === 'player'
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl uppercase tracking-tight text-[var(--text-primary)]">
          {copy.admin.sessions}
        </h1>
        <Link
          href="/admin/sessions/new"
          className="px-4 py-2 bg-[var(--brand-amber)] text-zinc-950 text-sm font-medium rounded-lg hover:bg-[var(--brand-amber-dim)] transition-colors"
        >
          {copy.admin.newSession}
        </Link>
      </div>

      {playerSessions.length === 0 ? (
        <p className="text-[var(--text-subtle)] text-sm text-center py-16">
          Nenhum encontro criado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {playerSessions.map(session => {
            const statusLabel: Record<string, string> = {
              scheduled: 'Agendado',
              live: 'Ao vivo',
              completed: 'Encerrado',
            }
            const isLive = session.status === 'live'

            return (
              <Link
                key={session.id}
                href={`/admin/sessions/${session.id}`}
                className="flex items-center justify-between px-4 py-3 bg-[var(--surface-1)] border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <p className="text-sm text-[var(--text-primary)] group-hover:text-white transition-colors">
                    {session.title}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                    {new Date(session.scheduled_at).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      isLive
                        ? 'bg-[var(--brand-green)]/15 text-[var(--brand-green)] border-[var(--brand-green)]/30'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-zinc-700'
                    }`}
                  >
                    {statusLabel[session.status] ?? session.status}
                  </span>
                  {isLive && (
                    <Link
                      href={`/admin/sessions/${session.id}/monitor`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-[var(--brand-amber)] hover:underline"
                    >
                      Monitor →
                    </Link>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
