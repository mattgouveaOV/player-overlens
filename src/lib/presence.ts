import { createServiceClient } from '@/lib/supabase/server'

export type JoinResult =
  | { ok: true; joinedAt: string }
  | { ok: false; reason: 'full' | 'room_not_found' | 'session_not_live' | 'rate_limited' }

/**
 * Chama a função plpgsql player_join_room via service_role.
 * A função atomicamente:
 * 1. Fecha presença ativa anterior do usuário na sessão
 * 2. Verifica capacidade da sala alvo
 * 3. Insere nova presença se há vaga
 */
export async function joinRoom(params: {
  userId: string
  sessionId: string
  roomId: string
}): Promise<JoinResult> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .schema('mentorados')
    .rpc('player_join_room', {
      p_user: params.userId,
      p_session: params.sessionId,
      p_room: params.roomId,
    })

  if (error) {
    console.error('[presence] player_join_room error:', error)
    throw new Error('Erro ao registrar presença')
  }

  return data as JoinResult
}

/**
 * Fecha a presença ativa do usuário em qualquer sala da sessão.
 * Chamado via /api/.../leave e no beforeunload (sendBeacon).
 */
export async function leaveRoom(params: {
  userId: string
  sessionId: string
}): Promise<void> {
  const supabase = createServiceClient()

  await supabase
    .schema('mentorados')
    .rpc('player_leave_session', {
      p_user: params.userId,
      p_session: params.sessionId,
    })
}

/**
 * Atualiza last_heartbeat para presença ativa do usuário.
 * Chamado a cada 30s para evitar cleanup de presença zumbi.
 */
export async function heartbeat(params: {
  userId: string
  sessionId: string
}): Promise<void> {
  const supabase = createServiceClient()

  await supabase
    .schema('mentorados')
    .rpc('player_heartbeat', {
      p_user: params.userId,
      p_session: params.sessionId,
    })
}
