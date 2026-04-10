import { RoomServiceClient } from 'livekit-server-sdk'

let _client: RoomServiceClient | null = null

export function getRoomServiceClient(): RoomServiceClient {
  if (!_client) {
    _client = new RoomServiceClient(
      process.env.LIVEKIT_URL!.replace('wss://', 'https://'),
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!
    )
  }
  return _client
}
