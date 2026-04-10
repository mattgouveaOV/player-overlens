import { AccessToken } from 'livekit-server-sdk'

export type ParticipantMode = 'conversa' | 'observar'

export interface MintTokenParams {
  identity: string         // user.id — imutável, evita duplicata de identidade
  name: string             // display name do mentorado
  roomName: string
  mode: ParticipantMode
  sessionScheduledAt: Date // nbf: token inválido antes do evento começar
}

/**
 * Minta um JWT LiveKit com TTL curto (120s).
 * Após conectado, a sessão LiveKit persiste independente do JWT.
 *
 * Claims:
 * - nbf = sessionScheduledAt (defense in depth: token inútil antes do horário)
 * - exp = now + 120s
 * - identity = user.id (LiveKit derruba duplicata de identidade)
 * - canPublish = true apenas para modo 'conversa'
 * - canPublishData = true (chat via data channels)
 */
export async function mintJoinToken(params: MintTokenParams): Promise<string> {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: params.identity,
      name: params.name,
      ttl: 120, // segundos
    }
  )

  // nbf: não válido antes do evento começar
  const nbf = Math.floor(params.sessionScheduledAt.getTime() / 1000)
  // Apenas se o evento ainda não começou (previne token "futuro" para sessões já live)
  const now = Math.floor(Date.now() / 1000)
  if (nbf > now) {
    // @ts-expect-error — nbf não está no tipo público mas é suportado pelo SDK
    token.notBefore = nbf
  }

  token.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: params.mode !== 'observar',
    canSubscribe: true,
    canPublishData: true,       // chat
    canUpdateOwnMetadata: true, // troca de nome exibido
  })

  return await token.toJwt()
}

/**
 * Token admin "hidden" — entra como observador invisível.
 * Usado no dry-run e no monitor da Ana.
 */
export async function mintAdminObserverToken(params: {
  identity: string
  roomName: string
}): Promise<string> {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: `admin_${params.identity}`,
      name: 'Observador',
      ttl: 3600, // 1h para admin
    }
  )

  token.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: false,
    canSubscribe: true,
    canPublishData: false,
    hidden: true, // invisível para outros participantes
  })

  return await token.toJwt()
}
