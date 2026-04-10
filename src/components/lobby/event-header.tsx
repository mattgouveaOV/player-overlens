'use client'

import { LiveBadge } from '@/components/ui/badge'
import { Countdown } from './countdown'
import { copy } from '@/lib/copy'
import { useRouter } from 'next/navigation'

interface EventHeaderProps {
  title: string
  status: 'scheduled' | 'live' | 'completed'
  scheduledAt: string
  durationMinutes: number
  onLive?: () => void
}

export function EventHeader({ title, status, scheduledAt, durationMinutes, onLive }: EventHeaderProps) {
  const router = useRouter()

  const endsAt = new Date(
    new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000
  ).toISOString()

  const minutesLeft = Math.ceil(
    (new Date(scheduledAt).getTime() - Date.now()) / 60000
  )

  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text-primary)] leading-tight mb-2">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          {status === 'live' && <LiveBadge />}
          {status === 'scheduled' && (
            <span className="text-sm text-[var(--text-muted)]">
              {copy.lobby.scheduled(minutesLeft)}
            </span>
          )}
          {status === 'live' && (
            <span className="text-sm text-[var(--text-muted)]">
              {copy.lobby.endsIn(Math.ceil(
                (new Date(endsAt).getTime() - Date.now()) / 60000
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {status === 'scheduled' && (
          <Countdown targetAt={scheduledAt} onExpired={() => router.refresh()} />
        )}
        {status === 'live' && (
          <Countdown targetAt={endsAt} onExpired={() => router.refresh()} />
        )}
        <a
          href={process.env.NEXT_PUBLIC_AREA_SECRETA_URL}
          className="text-sm text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
        >
          ← Sair
        </a>
      </div>
    </div>
  )
}
