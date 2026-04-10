import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/auth'

interface RoomInput {
  name: string
  description?: string
  anchor_prompt?: string
  max_members?: number
  cover_url?: string
  sort_order: number
}

interface SessionPayload {
  title: string
  scheduled_at: string
  duration_minutes: number
  mode: 'player'
  rooms: RoomInput[]
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'Erro de autenticação' }, { status: 500 })
  }

  const payload: SessionPayload = await req.json()
  const service = createServiceClient()

  // Cria sessão
  const { data: session, error: sessionError } = await service
    .schema('mentorados')
    .from('study_sessions')
    .insert({
      title: payload.title,
      scheduled_at: payload.scheduled_at,
      duration_minutes: payload.duration_minutes,
      mode: 'player',
      status: 'scheduled',
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('[admin] create session error:', sessionError?.message)
    return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
  }

  // Cria salas
  if (payload.rooms?.length > 0) {
    const roomRows = payload.rooms.map((r, i) => ({
      session_id: session.id,
      name: r.name,
      description: r.description ?? null,
      anchor_prompt: r.anchor_prompt ?? null,
      max_members: r.max_members ?? 8,
      cover_url: r.cover_url || null,
      sort_order: i,
      livekit_room_name: `sala_${session.id}_${i}`,
    }))

    const { error: roomsError } = await service
      .schema('mentorados')
      .from('study_rooms')
      .insert(roomRows)

    if (roomsError) {
      console.error('[admin] create rooms error:', roomsError.message)
      return NextResponse.json({ error: 'Erro ao criar salas' }, { status: 500 })
    }
  }

  console.log('[player.admin.session.created]', { id: session.id })
  return NextResponse.json({ id: session.id }, { status: 201 })
}
