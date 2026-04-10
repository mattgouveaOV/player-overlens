import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/sessions/[sid]/counts
 * Retorna lista de salas com contagens atuais.
 * Usado pelo RoomPage para carregar sessionData antes de conectar ao LiveKit.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  const { sid: sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: rooms } = await supabase
    .schema('mentorados')
    .from('study_rooms')
    .select('id, name, anchor_prompt, max_members, sort_order')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  if (!rooms) return NextResponse.json({ allRooms: [], initialCounts: [] })

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

  return NextResponse.json({
    allRooms: rooms.map(r => ({
      id: r.id,
      name: r.name,
      anchor_prompt: r.anchor_prompt ?? null,
      max_members: r.max_members ?? 0,
    })),
    initialCounts: rooms.map(r => ({
      roomId: r.id,
      count: countMap.get(r.id) ?? 0,
    })),
  })
}
