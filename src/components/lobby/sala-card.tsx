'use client'

import { useRouter } from 'next/navigation'
import { copy } from '@/lib/copy'

interface SalaCardProps {
  sessionId: string
  roomId: string
  name: string
  description: string | null
  anchorPrompt: string | null
  coverUrl: string | null
  count: number
  max: number
  sessionStatus: 'scheduled' | 'live' | 'completed'
}

export function SalaCard({
  sessionId,
  roomId,
  name,
  description,
  anchorPrompt,
  coverUrl,
  count,
  max,
  sessionStatus,
}: SalaCardProps) {
  const router = useRouter()
  const isFull = max > 0 && count >= max
  const isEmpty = count === 0
  const isLive = sessionStatus === 'live'

  const countLabel = isEmpty
    ? copy.sala.empty
    : isFull
    ? copy.sala.full(max)
    : copy.sala.open(count, max)

  function handleEnter() {
    if (!isLive || isFull) return
    router.push(`/s/${sessionId}/r/${roomId}`)
  }

  return (
    <div
      className={`
        group relative flex flex-col
        bg-[var(--surface-1)] border border-zinc-800
        rounded-xl overflow-hidden
        transition-all duration-200
        ${isLive && !isFull ? 'hover:border-zinc-600 cursor-pointer' : 'cursor-default'}
      `}
      onClick={isLive && !isFull ? handleEnter : undefined}
    >
      {/* Cover */}
      <div className="h-32 bg-zinc-900 relative overflow-hidden">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800" />
        )}
        {/* Count badge no canto */}
        <div className="absolute bottom-2 right-2">
          <span
            className={`
              text-xs px-2 py-0.5 rounded-full font-mono tabular-nums
              ${isFull
                ? 'bg-zinc-800 text-[var(--text-subtle)]'
                : 'bg-zinc-900/80 text-[var(--text-muted)]'
              }
            `}
          >
            {countLabel}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-display text-sm uppercase tracking-wide text-[var(--text-primary)] leading-tight">
          {name}
        </h3>

        {description && (
          <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        {anchorPrompt && (
          <p className="text-xs text-[var(--text-subtle)] italic leading-relaxed line-clamp-2 mt-auto pt-2 border-t border-zinc-800">
            &ldquo;{anchorPrompt}&rdquo;
          </p>
        )}
      </div>

      {/* CTA */}
      {isLive && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => { e.stopPropagation(); handleEnter() }}
            disabled={isFull}
            className={`
              w-full py-2 rounded-lg text-sm font-medium transition-colors duration-150
              ${isFull
                ? 'bg-[var(--surface-2)] text-[var(--text-subtle)] cursor-not-allowed'
                : 'bg-[var(--brand-amber)] text-zinc-950 hover:bg-[var(--brand-amber-dim)] cursor-pointer'
              }
            `}
          >
            {isFull ? copy.sala.fullCta : copy.sala.enter}
          </button>
        </div>
      )}
    </div>
  )
}
