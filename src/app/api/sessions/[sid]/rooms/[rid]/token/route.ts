import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joinRoom } from '@/lib/presence'
import { ensureRoom } from '@/lib/livekit/rooms'
import { mintJoinToken } from '@/lib/livekit/tokens'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sid: string; rid: string }> }
) {
  const { sid: sessionId, rid: roomId } = await params

  // Validação de header de origem
  if (!req.headers.get('X-Player-Client')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Auth — aceita cookie (padrão) ou Bearer token (fallback para iframe cross-domain)
  const supabase = await createClient()
  const bearerJwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? undefined
  const { data: { user } } = bearerJwt
    ? await supabase.auth.getUser(bearerJwt)
    : await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Membro ativo
  const { data: member } = await supabase
    .from('members')
    .select('name, status')
    .eq('email', user.email!)
    .single()

  if (!member || member.status !== 'ativo') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Sessão
  const { data: session } = await supabase
    .schema('mentorados')
    .from('study_sessions')
    .select('id, status, scheduled_at, duration_minutes, mode')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

  const sessionMode = (session as { mode?: string }).mode
  if (sessionMode !== 'player') {
    return NextResponse.json({ error: 'Modo inválido' }, { status: 403 })
  }

  // Janela de tempo
  const now = new Date()
  const scheduledAt = new Date(session.scheduled_at)
  const durationMinutes = (session as { duration_minutes?: number }).duration_minutes ?? 90
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000 + 5 * 60 * 1000) // + 5min grace

  if (session.status !== 'live') {
    if (now < scheduledAt) {
      return NextResponse.json({ error: 'Sessão ainda não abriu', reason: 'not_yet_open' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Sessão encerrada' }, { status: 410 })
  }

  if (now > endsAt) {
    return NextResponse.json({ error: 'Sessão encerrada' }, { status: 410 })
  }

  // Sala
  const { data: room } = await supabase
    .schema('mentorados')
    .from('study_rooms')
    .select('id, name, livekit_room_name, anchor_prompt, max_members')
    .eq('id', roomId)
    .eq('session_id', sessionId)
    .single()

  if (!room) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

  const livekitRoomName = (room as { livekit_room_name?: string }).livekit_room_name ?? `sala_${room.id}`

  // Transação de presença (fecha anterior + insere nova se tem vaga)
  const joinResult = await joinRoom({
    userId: user.id,
    sessionId,
    roomId,
  })

  if (!joinResult.ok) {
    if (joinResult.reason === 'full') {
      return NextResponse.json({ error: 'Sala cheia', reason: 'full' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Sala não encontrada', reason: joinResult.reason }, { status: 404 })
  }

  // Garante Room no LiveKit (idempotente)
  await ensureRoom({
    roomName: livekitRoomName,
    maxParticipants: (room as { max_members?: number }).max_members ?? 20,
    metadata: { sessionId, roomId: room.id, name: room.name },
  })

  // Minta token
  const token = await mintJoinToken({
    identity: user.id,
    name: member.name ?? user.email!.split('@')[0],
    roomName: livekitRoomName,
    mode: 'conversa',
    sessionScheduledAt: scheduledAt,
  })

  return NextResponse.json({
    token,
    wsUrl: process.env.LIVEKIT_URL!,
    roomName: livekitRoomName,
    anchorPrompt: (room as { anchor_prompt?: string }).anchor_prompt ?? null,
    expiresIn: 120,
  })
}
