import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/brand/header'
import { EventHeader } from '@/components/lobby/event-header'
import { SalaGrid } from '@/components/lobby/sala-grid'
import type { RoomCount } from '@/lib/realtime'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function LobbyPage({ params }: Props) {
  const { sessionId } = await params
  const supabase = await createClient()

  // Sessão
  const { data: session } = await supabase
    .schema('mentorados')
    .from('study_sessions')
    .select('id, title, status, scheduled_at, duration_minutes, mode')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  // Encerrada → redireciona
  if (session.status === 'completed' || session.status === 'cancelled') {
    redirect('/encerrado')
  }

  // Modo zoom legado → redireciona para área secreta
  if ((session as { mode?: string }).mode !== 'player') {
    redirect(`${process.env.NEXT_PUBLIC_AREA_SECRETA_URL}/salas-de-estudos`)
  }

  // Salas ordenadas
  const { data: rooms } = await supabase
    .schema('mentorados')
    .from('study_rooms')
    .select('id, name, description, anchor_prompt, cover_url, max_members, sort_order')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  if (!rooms?.length) notFound()

  // Contagens iniciais (server-side para primeiro render)
  const { data: presenceRows } = await supabase
    .schema('mentorados')
    .from('study_presence')
    .select('room_id')
    .in('room_id', rooms.map(r => r.id))
    .is('left_at', null)

  const countMap = new Map<string, number>()
  for (const row of presenceRows ?? []) {
    countMap.set(row.room_id, (countMap.get(row.room_id) ?? 0) + 1)
  }

  const initialCounts: RoomCount[] = rooms.map(r => ({
    roomId: r.id,
    count: countMap.get(r.id) ?? 0,
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <EventHeader
          title={session.title}
          status={session.status as 'scheduled' | 'live' | 'completed'}
          scheduledAt={session.scheduled_at}
          durationMinutes={(session as { duration_minutes?: number }).duration_minutes ?? 90}
        />

        {session.status === 'scheduled' ? (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-sm mb-8">
              Ainda em silêncio. As salas abrem no horário marcado.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-40 pointer-events-none select-none">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className="bg-[var(--surface-1)] border border-zinc-800 rounded-xl h-48"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {session.status === 'live' ? 'Escolha por onde atravessar' : ''}
            </p>
            <SalaGrid
              sessionId={sessionId}
              sessionStatus={session.status as 'scheduled' | 'live' | 'completed'}
              rooms={rooms}
              initialCounts={initialCounts}
            />
          </>
        )}
      </main>
    </div>
  )
}
