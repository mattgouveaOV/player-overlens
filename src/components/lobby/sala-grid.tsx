'use client'

import { SalaCard } from './sala-card'
import { useLiveRoomCounts, type RoomCount } from '@/lib/realtime'

interface Room {
  id: string
  name: string
  description: string | null
  anchor_prompt: string | null
  cover_url: string | null
  max_members: number
}

interface SalaGridProps {
  sessionId: string
  sessionStatus: 'scheduled' | 'live' | 'completed'
  rooms: Room[]
  initialCounts: RoomCount[]
}

export function SalaGrid({ sessionId, sessionStatus, rooms, initialCounts }: SalaGridProps) {
  const counts = useLiveRoomCounts(sessionId, initialCounts)

  const countFor = (roomId: string) =>
    counts.find(c => c.roomId === roomId)?.count ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map(room => (
        <SalaCard
          key={room.id}
          sessionId={sessionId}
          roomId={room.id}
          name={room.name}
          description={room.description}
          anchorPrompt={room.anchor_prompt}
          coverUrl={room.cover_url}
          count={countFor(room.id)}
          max={room.max_members ?? 0}
          sessionStatus={sessionStatus}
        />
      ))}
    </div>
  )
}
