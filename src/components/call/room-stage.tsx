'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useConnectionState,
} from '@livekit/components-react'
import { ConnectionState, Track } from 'livekit-client'
import { Controls } from './controls'
import { PromptAnchor } from './prompt-anchor'
import { copy } from '@/lib/copy'
import type { RoomCount } from '@/lib/realtime'

// LiveKit Room importado dinamicamente — não roda em SSR
const LiveKitRoom = dynamic(
  () => import('@livekit/components-react').then(m => m.LiveKitRoom),
  { ssr: false }
)

// SalaRail e ChatPanel também client-only
const SalaRail = dynamic(() => import('./sala-rail').then(m => m.SalaRail), { ssr: false })
const ChatPanel = dynamic(() => import('./chat-panel').then(m => m.ChatPanel), { ssr: false })

interface Room {
  id: string
  name: string
  anchor_prompt: string | null
  max_members: number
}

interface RoomStageProps {
  sessionId: string
  room: Room
  allRooms: Room[]
  initialCounts: RoomCount[]
  serverUrl: string
  token: string
  initialCamOn: boolean
  initialMicOn: boolean
}

function InCallUI({
  sessionId,
  room,
  allRooms,
  initialCounts,
  onLeave,
  onAtravessar,
  isAtravessando,
}: {
  sessionId: string
  room: Room
  allRooms: Room[]
  initialCounts: RoomCount[]
  onLeave: () => void
  onAtravessar: (roomId: string) => void
  isAtravessando: boolean
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const connectionState = useConnectionState()
  const [isEmbedded, setIsEmbedded] = useState(false)

  useEffect(() => {
    setIsEmbedded(window.self !== window.top)
  }, [])

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  // Reset unread quando chat abre
  useEffect(() => {
    if (chatOpen) setChatUnread(0)
  }, [chatOpen])

  const isReconnecting = connectionState === ConnectionState.Reconnecting

  return (
    <div className="flex flex-col h-screen">
      {/* Header — oculto quando embedado em iframe (area-secreta já tem o seu) */}
      {!isEmbedded && (
        <header className="h-10 px-4 flex items-center justify-between border-b border-zinc-800 bg-[var(--background)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-display text-xs uppercase tracking-wide text-[var(--text-primary)]">
              {room.name}
            </span>
            {isReconnecting && (
              <span className="text-xs text-[var(--brand-amber)] animate-pulse">
                {copy.inCall.reconnecting}
              </span>
            )}
          </div>
          <button
            onClick={onLeave}
            className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors cursor-pointer"
          >
            {copy.inCall.lobby}
          </button>
        </header>
      )}

      {/* Corpo principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Área de vídeo */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Grid de tiles */}
          <div className="flex-1 relative p-2">
            <GridLayout tracks={tracks} className="h-full">
              <ParticipantTile />
            </GridLayout>
          </div>

          {/* Prompt-âncora persistente */}
          {room.anchor_prompt && (
            <div className="px-4 py-2 border-t border-zinc-900">
              <PromptAnchor text={room.anchor_prompt} />
            </div>
          )}
        </main>

        {/* Sidebar — chat ao vivo (desktop) */}
        {chatOpen && (
          <aside
            className="hidden lg:flex flex-col w-64 border-l border-zinc-800 bg-[var(--surface-1)]"
            role="complementary"
            aria-label="Chat da sala"
          >
            <ChatPanel />
          </aside>
        )}
      </div>

      {/* Átravessando overlay */}
      {isAtravessando && (
        <div className="absolute inset-0 bg-[var(--background)]/80 flex items-center justify-center z-50">
          <span className="text-sm text-[var(--text-muted)] animate-atravessando">
            {copy.inCall.atravessando}
          </span>
        </div>
      )}

      {/* Controles */}
      <Controls
        onLeave={onLeave}
        onToggleChat={() => setChatOpen(v => !v)}
        chatOpen={chatOpen}
        chatUnread={chatUnread}
      />

      <RoomAudioRenderer />
    </div>
  )
}

export function RoomStage({
  sessionId,
  room,
  allRooms,
  initialCounts,
  serverUrl,
  token,
  initialCamOn,
  initialMicOn,
}: RoomStageProps) {
  const router = useRouter()
  const [isAtravessando, setIsAtravessando] = useState(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Heartbeat a cada 30s — mantém presença viva
  useEffect(() => {
    heartbeatRef.current = setInterval(async () => {
      await fetch(`/api/sessions/${sessionId}/heartbeat`, {
        method: 'POST',
        headers: { 'X-Player-Client': '1' },
      })
    }, 30_000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [sessionId])

  // sendBeacon na saída
  useEffect(() => {
    const handleUnload = () => {
      navigator.sendBeacon(
        `/api/sessions/${sessionId}/leave`,
        JSON.stringify({ roomId: room.id })
      )
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [sessionId, room.id])

  const handleLeave = useCallback(async () => {
    await fetch(`/api/sessions/${sessionId}/leave`, {
      method: 'POST',
      headers: { 'X-Player-Client': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id }),
    })
    router.push(`/s/${sessionId}`)
  }, [sessionId, room.id, router])

  const handleAtravessar = useCallback(
    async (targetRoomId: string) => {
      if (isAtravessando) return
      setIsAtravessando(true)

      // Mínimo 600ms para o ritual visual
      const minDelay = new Promise(r => setTimeout(r, 600))
      const leave = fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST',
        headers: { 'X-Player-Client': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      })
      await Promise.all([minDelay, leave])

      // Replace para não poluir histórico + skipPreview para ir direto ao token
      router.replace(`/s/${sessionId}/r/${targetRoomId}?skipPreview=1`)
    },
    [isAtravessando, sessionId, room.id, router]
  )

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={initialMicOn}
      video={initialCamOn}
      onDisconnected={() => router.push(`/s/${sessionId}`)}
      className="h-screen bg-[var(--background)]"
    >
      <InCallUI
        sessionId={sessionId}
        room={room}
        allRooms={allRooms}
        initialCounts={initialCounts}
        onLeave={handleLeave}
        onAtravessar={handleAtravessar}
        isAtravessando={isAtravessando}
      />
    </LiveKitRoom>
  )
}
