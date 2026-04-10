'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { use } from 'react'
import { PreviewGate } from '@/components/call/preview-gate'
import { RoomStage } from '@/components/call/room-stage'
import { createClient } from '@/lib/supabase/client'
import type { RoomCount } from '@/lib/realtime'

interface TokenResponse {
  token: string
  wsUrl: string
  roomName: string
  anchorPrompt: string | null
  expiresIn: number
}

interface RoomData {
  id: string
  name: string
  anchor_prompt: string | null
  max_members: number
}

interface SessionData {
  allRooms: RoomData[]
  initialCounts: RoomCount[]
}

interface Props {
  params: Promise<{ sessionId: string; roomId: string }>
}

type Phase = 'preview' | 'entering' | 'incall' | 'error'

export default function RoomPage({ params }: Props) {
  const { sessionId, roomId } = use(params)
  const searchParams = useSearchParams()
  const skipPreview = searchParams.get('skipPreview') === '1'
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>(skipPreview ? 'entering' : 'preview')
  const [errorMsg, setErrorMsg] = useState<string>()
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [enterCam, setEnterCam] = useState(false)
  const [enterMic, setEnterMic] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  // Lê tokens de auth do hash fragment (passados pela área-secreta no cross-domain iframe)
  // O hash nunca é enviado ao servidor — seguro para tokens de sessão
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const at = hash.get('at')
    const rt = hash.get('rt')

    if (at) {
      const supabase = createClient()
      supabase.auth
        .setSession({ access_token: at, refresh_token: rt ?? '' })
        .finally(() => {
          // Remove tokens da URL imediatamente após uso
          window.history.replaceState({}, '', window.location.pathname + window.location.search)
          setAuthReady(true)
        })
    } else {
      setAuthReady(true)
    }
  }, [])

  // Carrega dados da sessão (salas + counts) após auth estar pronta
  useEffect(() => {
    if (!authReady) return
    fetch(`/api/sessions/${sessionId}/counts`)
      .then(r => r.json())
      .then(data => setSessionData(data))
      .catch(() => {})
  }, [sessionId, authReady])

  async function fetchToken(): Promise<TokenResponse | null> {
    const res = await fetch(`/api/sessions/${sessionId}/rooms/${roomId}/token`, {
      method: 'POST',
      headers: { 'X-Player-Client': '1' },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const reason = body.reason as string | undefined

      if (reason === 'full') setErrorMsg('Esta sala está cheia. Escolha outra.')
      else if (res.status === 409 && reason === 'not_yet_open') setErrorMsg('O encontro ainda não abriu.')
      else if (res.status === 410) setErrorMsg('Este encontro foi encerrado.')
      else if (res.status === 401) setErrorMsg('Faça login na área secreta para acessar.')
      else setErrorMsg('Algo deu errado. Tente novamente.')

      setPhase('error')
      return null
    }

    return res.json()
  }

  async function handleEnter({ withCamera, withMic }: { withCamera: boolean; withMic: boolean; videoDeviceId?: string }) {
    setEnterCam(withCamera)
    setEnterMic(withMic)
    setPhase('entering')
    try {
      const data = await fetchToken()
      if (!data) return
      setTokenData(data)
      setPhase('incall')
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setPhase('error')
    }
  }

  // skipPreview: vai direto buscar token após auth estar pronta
  useEffect(() => {
    if (!authReady || !skipPreview) return
    fetchToken().then(data => {
      if (!data) return
      setTokenData(data)
      setPhase('incall')
    }).catch(() => {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setPhase('error')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady])

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-[var(--text-muted)] text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push(`/s/${sessionId}`)}
            className="text-sm text-[var(--brand-amber)] hover:underline cursor-pointer"
          >
            ← Voltar para o mapa
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'preview' || phase === 'entering') {
    const room = sessionData?.allRooms.find(r => r.id === roomId)

    return (
      <PreviewGate
        roomName={room?.name ?? '…'}
        anchorPrompt={room?.anchor_prompt ?? null}
        onEnter={handleEnter}
        onBack={() => router.push(`/s/${sessionId}`)}
        isEntering={phase === 'entering'}
      />
    )
  }

  if (phase === 'incall' && tokenData && sessionData) {
    const currentRoom = sessionData.allRooms.find(r => r.id === roomId) ?? {
      id: roomId,
      name: '…',
      anchor_prompt: tokenData.anchorPrompt,
      max_members: 0,
    }

    return (
      <RoomStage
        sessionId={sessionId}
        room={currentRoom}
        allRooms={sessionData.allRooms}
        initialCounts={sessionData.initialCounts}
        serverUrl={tokenData.wsUrl}
        token={tokenData.token}
        initialCamOn={enterCam}
        initialMicOn={enterMic}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-[var(--brand-amber)] rounded-full animate-spin" />
    </div>
  )
}
