import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  try {
    await requireAdmin()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'Erro de autenticação' }, { status: 500 })
  }

  const payload = await req.json()
  const service = createServiceClient()

  // Atualiza sessão
  const { error: sessionError } = await service
    .schema('mentorados')
    .from('study_sessions')
    .update({
      title: payload.title,
      scheduled_at: payload.scheduled_at,
      duration_minutes: payload.duration_minutes,
    })
    .eq('id', sessionId)

  if (sessionError) {
    return NextResponse.json({ error: 'Erro ao atualizar sessão' }, { status: 500 })
  }

  // Recria salas: deleta as existentes e insere as novas
  if (payload.rooms) {
    await service
      .schema('mentorados')
      .from('study_rooms')
      .delete()
      .eq('session_id', sessionId)

    if (payload.rooms.length > 0) {
      const roomRows = payload.rooms.map((r: { name: string; description?: string; anchor_prompt?: string; max_members?: number; cover_url?: string }, i: number) => ({
        session_id: sessionId,
        name: r.name,
        description: r.description ?? null,
        anchor_prompt: r.anchor_prompt ?? null,
        max_members: r.max_members ?? 8,
        cover_url: r.cover_url || null,
        sort_order: i,
        livekit_room_name: `sala_${sessionId}_${i}`,
      }))

      const { error: roomsError } = await service
        .schema('mentorados')
        .from('study_rooms')
        .insert(roomRows)

      if (roomsError) {
        return NextResponse.json({ error: 'Erro ao atualizar salas' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ id: sessionId })
}
