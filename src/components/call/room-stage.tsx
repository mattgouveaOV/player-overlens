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
  FocusLayoutContainer,
  FocusLayout,
  CarouselLayout,
  LayoutContextProvider,
  useCreateLayoutContext,
  usePinnedTracks,
  isTrackReference,
} from '@livekit/components-react'
import { AudioPresets, ConnectionState, RoomEvent, Track } from 'livekit-client'
import type { RoomOptions } from 'livekit-client'
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core'
import { Controls } from './controls'
import { PromptAnchor } from './prompt-anchor'
import { copy } from '@/lib/copy'
import type { RoomCount } from '@/lib/realtime'
import { clearDevicePrefs } from '@/lib/device-prefs'

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
  initialCamId?: string
  initialMicId?: string
  bearerToken: string | null
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

  // LayoutContext oficial do LiveKit — habilita click-to-pin nativo dos ParticipantTiles
  // e o hook usePinnedTracks para ler o estado de pin.
  const layoutContext = useCreateLayoutContext()

  useEffect(() => {
    setIsEmbedded(window.self !== window.top)
  }, [])

  // Uma tile por participante: Camera (com placeholder se câmera off) + ScreenShare quando ativo.
  // updateOnlyOn minimiza re-renders — só atualiza quando a lista de falantes ativos muda.
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  )

  // Dedupe por participant.identity para evitar tiles fantasmas durante transições.
  const tracks = (() => {
    const seen = new Set<string>()
    const result: typeof rawTracks = []
    for (const t of rawTracks) {
      if (t.source !== Track.Source.ScreenShare) continue
      const key = `ss:${t.participant.identity}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push(t)
    }
    for (const t of rawTracks) {
      if (t.source !== Track.Source.Camera) continue
      const key = `cam:${t.participant.identity}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push(t)
    }
    return result
  })()

  // Focus track vem do LayoutContext (pin manual do usuário OU auto-pin de screen share).
  // LiveKit não faz auto-focus por voz — isso evita o ping-pong clássico quando o falante
  // pausa. Em vez disso, o GridLayout reordena tiles via useVisualStableUpdate para manter
  // falantes ativos na primeira página (padrão do Meet/Zoom).
  const focusTrack = usePinnedTracks(layoutContext)?.[0]

  // Auto-pin de screen share — padrão do prefab VideoConference oficial.
  // Quando alguém compartilha a tela, pina automaticamente. Quando para, desfaz.
  const autoPinRef = useRef<TrackReferenceOrPlaceholder | null>(null)
  useEffect(() => {
    const screenShares = tracks.filter(
      (t): t is typeof t & { source: Track.Source.ScreenShare } =>
        t.source === Track.Source.ScreenShare && isTrackReference(t),
    )
    const prev = autoPinRef.current

    if (screenShares.length > 0) {
      const current = screenShares[0]
      if (!prev) {
        layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: current })
        autoPinRef.current = current
      }
    } else if (prev) {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' })
      autoPinRef.current = null
    }
  }, [tracks, layoutContext])

  const carouselTracks = focusTrack
    ? tracks.filter(
        t => !(t.participant.identity === focusTrack.participant.identity && t.source === focusTrack.source)
      )
    : tracks

  // Reset unread quando chat abre
  useEffect(() => {
    if (chatOpen) setChatUnread(0)
  }, [chatOpen])

  const isReconnecting = connectionState === ConnectionState.Reconnecting

  return (
    <LayoutContextProvider value={layoutContext}>
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

      {/* Corpo principal — min-h-0 permite que os filhos flex shrinquem */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Área de vídeo */}
        <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {/* Layout automático: grade quando não há pin; falante quando há pin ou screen share.
              O ParticipantTile default já renderiza o botão FocusToggle interno (click-to-pin)
              quando está dentro de LayoutContextProvider — por isso não precisamos de wrapper. */}
          <div className="flex-1 min-h-0 relative p-2">
            {focusTrack ? (
              <FocusLayoutContainer className="h-full">
                <CarouselLayout tracks={carouselTracks}>
                  <ParticipantTile />
                </CarouselLayout>
                <FocusLayout trackRef={focusTrack} />
              </FocusLayoutContainer>
            ) : (
              <GridLayout tracks={tracks} className="h-full">
                <ParticipantTile />
              </GridLayout>
            )}
          </div>

          {/* Prompt-âncora persistente */}
          {room.anchor_prompt && (
            <div className="shrink-0 px-4 py-2 border-t border-zinc-900">
              <PromptAnchor text={room.anchor_prompt} />
            </div>
          )}
        </main>

        {/* Sidebar — chat ao vivo (desktop) */}
        {chatOpen && (
          <aside
            className="hidden lg:flex flex-col w-64 shrink-0 border-l border-zinc-800 bg-[var(--surface-1)]"
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
    </LayoutContextProvider>
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
  initialCamId,
  initialMicId,
  bearerToken,
}: RoomStageProps) {
  const router = useRouter()
  const [isAtravessando, setIsAtravessando] = useState(false)
  const isAtravessandoRef = useRef(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const authHeaders = useCallback((): HeadersInit => {
    return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}
  }, [bearerToken])

  // Heartbeat a cada 30s — mantém presença viva
  useEffect(() => {
    heartbeatRef.current = setInterval(async () => {
      await fetch(`/api/sessions/${sessionId}/heartbeat`, {
        method: 'POST',
        headers: { 'X-Player-Client': '1', ...authHeaders() },
      })
    }, 30_000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [sessionId, authHeaders])

  // Saída na unload — sendBeacon não aceita headers, usa ?at= no query
  // pagehide é MAIS confiável que beforeunload (Safari/iOS + iframes)
  // visibilitychange cobre o caso "aba fica oculta" que em mobile = destruição
  useEffect(() => {
    const sendLeaveBeacon = () => {
      const url = bearerToken
        ? `/api/sessions/${sessionId}/leave?at=${encodeURIComponent(bearerToken)}`
        : `/api/sessions/${sessionId}/leave`
      navigator.sendBeacon(url, JSON.stringify({ roomId: room.id }))
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') sendLeaveBeacon()
    }
    window.addEventListener('pagehide', sendLeaveBeacon)
    window.addEventListener('beforeunload', sendLeaveBeacon)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('pagehide', sendLeaveBeacon)
      window.removeEventListener('beforeunload', sendLeaveBeacon)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [sessionId, room.id, bearerToken])

  const handleLeave = useCallback(async () => {
    await fetch(`/api/sessions/${sessionId}/leave`, {
      method: 'POST',
      headers: { 'X-Player-Client': '1', 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ roomId: room.id }),
    })

    // Se estiver embedado (iframe da area-secreta), avisa o parent para navegar
    // até o mapa. Navegar internamente para /s/[sessionId] não funciona porque
    // aquela rota depende de cookies que não cruzam iframe cross-domain.
    if (typeof window !== 'undefined' && window.self !== window.top) {
      // intentional: true distinguishes user-initiated leave from stale disconnect
      // events that fire during room switching (old Player unloads → onDisconnected).
      clearDevicePrefs()
      window.parent.postMessage({ type: 'player:leave', intentional: true }, '*')
      return
    }

    router.push(`/s/${sessionId}`)
  }, [sessionId, room.id, router, authHeaders])

  const handleAtravessar = useCallback(
    async (targetRoomId: string) => {
      if (isAtravessando) return
      setIsAtravessando(true)
      isAtravessandoRef.current = true

      // Mínimo 600ms para o ritual visual
      const minDelay = new Promise(r => setTimeout(r, 600))
      const leave = fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST',
        headers: { 'X-Player-Client': '1', 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ roomId: room.id }),
      })
      await Promise.all([minDelay, leave])

      // Replace para não poluir histórico + skipPreview para ir direto ao token
      router.replace(`/s/${sessionId}/r/${targetRoomId}?skipPreview=1`)
    },
    [isAtravessando, sessionId, room.id, router, authHeaders]
  )

  // Escuta postMessage do parent (area-secreta) para trocar de sala sem recarregar o iframe.
  // O parent manda { type: 'player:switch', targetRoomId } em vez de mudar o src do iframe.
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (typeof e.data !== 'object' || e.data === null) return
      if (e.data.type === 'player:switch' && typeof e.data.targetRoomId === 'string') {
        handleAtravessar(e.data.targetRoomId)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleAtravessar])

  // Opções de áudio explícitas — AEC/NS/AGC/VoiceIsolation já existem como default
  // no livekit-client, mas passar explicitamente garante que o Chrome aplique a forma
  // mais forte (ConstrainBoolean via ideal: true vs boolean puro).
  // channelCount: 1 (mono) é crítico: o AEC do navegador funciona muito melhor em mono;
  // stereo aumenta latência de referência e causa eco residual em caixinhas.
  // audioPreset.speech (24 kbps) é calibrado para voz — padrão `music` (48 kbps) é
  // excessivo e sobrecarrega o cancelador.
  const roomOptions: RoomOptions = {
    audioCaptureDefaults: {
      autoGainControl: { ideal: true },
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      voiceIsolation: { ideal: true },
      channelCount: 1,
      sampleRate: { ideal: 16000 },
    },
    publishDefaults: {
      audioPreset: AudioPresets.speech,
      dtx: true,
      red: true,
    },
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={initialMicOn ? (initialMicId ? { deviceId: initialMicId } : true) : false}
      video={initialCamOn ? (initialCamId ? { deviceId: initialCamId } : true) : false}
      options={roomOptions}
      onDisconnected={() => {
        // Durante troca de sala (isAtravessando), o disconnect é esperado.
        // Não enviar player:leave — o modal do parent deve permanecer visível
        // até player:ready da nova sala.
        if (isAtravessandoRef.current) return
        if (typeof window !== 'undefined' && window.self !== window.top) {
          window.parent.postMessage({ type: 'player:leave' }, '*')
          return
        }
        router.push(`/s/${sessionId}`)
      }}
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
