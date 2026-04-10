import { getRoomServiceClient } from './server'

export interface RoomMetadata {
  sessionId: string
  roomId: string
  name: string
}

/**
 * Garante que a Room existe no LiveKit Cloud.
 * Idempotente — se já existe, retorna sem erro.
 */
export async function ensureRoom(params: {
  roomName: string
  maxParticipants: number
  metadata: RoomMetadata
  emptyTimeoutSeconds?: number
}): Promise<void> {
  const client = getRoomServiceClient()

  await client.createRoom({
    name: params.roomName,
    maxParticipants: params.maxParticipants,
    // Grace period: sala fecha automaticamente 10 min após ficar vazia
    emptyTimeout: params.emptyTimeoutSeconds ?? 600,
    metadata: JSON.stringify(params.metadata),
  })
}

/**
 * Remove uma Room do LiveKit Cloud (usado no encerramento do evento).
 * Não lança erro se a Room já não existe.
 */
export async function deleteRoom(roomName: string): Promise<void> {
  const client = getRoomServiceClient()
  try {
    await client.deleteRoom(roomName)
  } catch {
    // Room já não existe — ok
  }
}
