'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export interface RoomCount {
  roomId: string
  count: number
}

/**
 * Hook que assina o canal Realtime do Postgres Changes
 * e retorna contagens ao vivo por sala para uma sessão.
 *
 * Fonte de verdade: mentorados.study_presence (left_at IS NULL).
 * Latência esperada: 200–800ms após insert/update.
 */
export function useLiveRoomCounts(
  sessionId: string,
  initialCounts: RoomCount[]
): RoomCount[] {
  const [counts, setCounts] = useState<RoomCount[]>(initialCounts)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`session-presence-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'mentorados',
          table: 'study_presence',
        },
        async () => {
          // Re-fetch counts para toda a sessão ao receber qualquer mudança
          const { data } = await supabase
            .schema('mentorados')
            .from('study_presence')
            .select('room_id, study_rooms!inner(session_id)')
            .eq('study_rooms.session_id', sessionId)
            .is('left_at', null)

          if (!data) return

          const countMap = new Map<string, number>()
          for (const row of data) {
            const prev = countMap.get(row.room_id) ?? 0
            countMap.set(row.room_id, prev + 1)
          }

          setCounts(prev =>
            prev.map(rc => ({
              ...rc,
              count: countMap.get(rc.roomId) ?? 0,
            }))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return counts
}
