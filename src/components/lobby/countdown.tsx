'use client'

import { useEffect, useState } from 'react'

interface CountdownProps {
  targetAt: string // ISO string
  onExpired?: () => void
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function Countdown({ targetAt, onExpired }: CountdownProps) {
  const [remaining, setRemaining] = useState(() =>
    new Date(targetAt).getTime() - Date.now()
  )

  useEffect(() => {
    if (remaining <= 0) {
      onExpired?.()
      return
    }

    const id = setInterval(() => {
      const ms = new Date(targetAt).getTime() - Date.now()
      setRemaining(ms)
      if (ms <= 0) {
        clearInterval(id)
        onExpired?.()
      }
    }, 1000)

    return () => clearInterval(id)
  }, [targetAt, onExpired, remaining])

  return (
    <span className="font-mono text-sm text-[var(--text-muted)] tabular-nums">
      {formatRemaining(Math.max(0, remaining))}
    </span>
  )
}
