'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { use } from 'react'
import { PreviewGate } from '@/components/call/preview-gate'
import { RoomStage } from '@/components/call/room-stage'
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

  // Carrega dados da sessão (salas + counts) para o rail
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/counts`)
      .then(r => r.json())
      .then(data => setSessionData(data))
      .catch(() => {})
  }, [sessionId])

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
    const data = await fetchToken()
    if (!data) return
    setTokenData(data)
    setPhase('incall')
  }

  // skipPreview: vai direto buscar token
  useEffect(() => {
    if (skipPreview) {
      fetchToken().then(data => {
        if (!data) return
        setTokenData(data)
        setPhase('incall')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    // Busca nome da sala para o preview gate
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

  // Carregando
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-[var(--brand-amber)] rounded-full animate-spin" />
    </div>
  )
}
