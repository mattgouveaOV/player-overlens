'use client'

import { useLiveRoomCounts, type RoomCount } from '@/lib/realtime'

interface Room {
  id: string
  name: string
  max_members: number
}

interface SalaRailProps {
  sessionId: string
  currentRoomId: string
  rooms: Room[]
  initialCounts: RoomCount[]
  onAtravessar: (roomId: string) => void
  isAtravessando?: boolean
}

export function SalaRail({
  sessionId,
  currentRoomId,
  rooms,
  initialCounts,
  onAtravessar,
  isAtravessando,
}: SalaRailProps) {
  const counts = useLiveRoomCounts(sessionId, initialCounts)

  const otherRooms = rooms.filter(r => r.id !== currentRoomId)

  const countFor = (roomId: string) =>
    counts.find(c => c.roomId === roomId)?.count ?? 0

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-medium text-[var(--text-subtle)] uppercase tracking-wider px-3 pt-3 pb-2">
        Atravessar para
      </p>
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 px-2 pb-2">
        {otherRooms.map(room => {
          const count = countFor(room.id)
          const isFull = room.max_members > 0 && count >= room.max_members

          return (
            <button
              key={room.id}
              onClick={() => !isFull && !isAtravessando && onAtravessar(room.id)}
              disabled={isFull || isAtravessando}
              className={`
                w-full text-left px-3 py-2.5 rounded-lg
                border transition-all duration-150
                ${isFull
                  ? 'border-zinc-800 bg-[var(--surface-1)] opacity-50 cursor-not-allowed'
                  : 'border-zinc-800 bg-[var(--surface-1)] hover:border-zinc-600 hover:bg-[var(--surface-2)] cursor-pointer'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-display uppercase tracking-wide text-[var(--text-primary)] leading-tight line-clamp-2">
                  {room.name}
                </span>
                <span className={`
                  text-xs font-mono tabular-nums shrink-0 mt-0.5
                  ${isFull ? 'text-[var(--text-subtle)]' : 'text-[var(--brand-green)]'}
                `}>
                  {isFull ? '⛔' : count > 0 ? count : '—'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
