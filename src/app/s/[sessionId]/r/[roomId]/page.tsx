import { RoomPageClient } from './room-page-client'

interface Props {
  params: Promise<{ sessionId: string; roomId: string }>
}

export default async function RoomPage({ params }: Props) {
  const { sessionId, roomId } = await params
  return <RoomPageClient sessionId={sessionId} roomId={roomId} />
}
