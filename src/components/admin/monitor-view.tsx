'use client'

import { useLiveRoomCounts, type RoomCount } from '@/lib/realtime'

interface Room {
  id: string
  name: string
  max_members: number
}

interface PresenceRow {
  room_id: string
  user_id: string
  joined_at: string
  left_at: string | null
}

interface MonitorViewProps {
  sessionId: string
  rooms: Room[]
  presenceRows: PresenceRow[]
}

export function MonitorView({ sessionId, rooms, presenceRows }: MonitorViewProps) {
  const initialCounts: RoomCount[] = rooms.map(r => ({
    roomId: r.id,
    count: presenceRows.filter(p => p.room_id === r.id && !p.left_at).length,
  }))

  const counts = useLiveRoomCounts(sessionId, initialCounts)

  const totalPresent = counts.reduce((acc, c) => acc + c.count, 0)
  const totalTraversals = presenceRows.length

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Presentes agora" value={totalPresent} />
        <StatCard label="Atravessamentos" value={totalTraversals} />
        <StatCard label="Salas ativas" value={counts.filter(c => c.count > 0).length} />
      </div>

      {/* Por sala */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-[var(--text-subtle)] uppercase tracking-wider">
          Por sala
        </h2>
        {rooms.map(room => {
          const count = counts.find(c => c.roomId === room.id)?.count ?? 0
          const fillPct = room.max_members > 0 ? (count / room.max_members) * 100 : 0

          return (
            <div
              key={room.id}
              className="bg-[var(--surface-1)] border border-zinc-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-display uppercase tracking-wide text-[var(--text-primary)]">
                  {room.name}
                </span>
                <span className="text-sm font-mono tabular-nums text-[var(--brand-green)]">
                  {count}
                  {room.max_members > 0 && (
                    <span className="text-[var(--text-subtle)]"> / {room.max_members}</span>
                  )}
                </span>
              </div>
              {room.max_members > 0 && (
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand-green)] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, fillPct)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Histórico de presença */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-[var(--text-subtle)] uppercase tracking-wider">
          Histórico de atravessamentos
        </h2>
        <div className="bg-[var(--surface-1)] border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-2 text-left text-[var(--text-subtle)] font-normal">Sala</th>
                <th className="px-4 py-2 text-left text-[var(--text-subtle)] font-normal">Entrada</th>
                <th className="px-4 py-2 text-left text-[var(--text-subtle)] font-normal">Saída</th>
              </tr>
            </thead>
            <tbody>
              {presenceRows.slice(-50).reverse().map((p, i) => {
                const room = rooms.find(r => r.id === p.room_id)
                return (
                  <tr key={i} className="border-b border-zinc-900 last:border-0">
                    <td className="px-4 py-2 text-[var(--text-muted)] font-display uppercase tracking-wide truncate max-w-[12rem]">
                      {room?.name ?? p.room_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 font-mono text-[var(--text-subtle)]">
                      {new Date(p.joined_at).toLocaleTimeString('pt-BR', { timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2 font-mono text-[var(--text-subtle)]">
                      {p.left_at
                        ? new Date(p.left_at).toLocaleTimeString('pt-BR', { timeStyle: 'short' })
                        : <span className="text-[var(--brand-green)]">presente</span>
                      }
                    </td>
                  </tr>
                )
              })}
              {presenceRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-subtle)]">
                    Nenhum atravessamento ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--surface-1)] border border-zinc-800 rounded-xl p-4">
      <p className="text-2xl font-mono tabular-nums text-[var(--text-primary)] mb-1">{value}</p>
      <p className="text-xs text-[var(--text-subtle)]">{label}</p>
    </div>
  )
}
