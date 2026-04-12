'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PreviewGate } from '@/components/call/preview-gate'
import { RoomStage } from '@/components/call/room-stage'
import { createClient } from '@/lib/supabase/client'
import type { RoomCount } from '@/lib/realtime'
import { getDevicePrefs } from '@/lib/device-prefs'

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
  sessionId: string
  roomId: string
}

type Phase = 'preview' | 'entering' | 'incall' | 'error'

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-[var(--brand-amber)] rounded-full animate-spin" />
    </div>
  )
}

// Componente interno usa useSearchParams() dentro de Suspense
function RoomPageInner({ sessionId, roomId }: Props) {
  const searchParams = useSearchParams()
  const skipPreview = searchParams.get('skipPreview') === '1'
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('preview')
  const [errorMsg, setErrorMsg] = useState<string>()
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [enterCam, setEnterCam] = useState(false)
  const [enterMic, setEnterMic] = useState(false)
  const [enterCamId, setEnterCamId] = useState('')
  const [enterMicId, setEnterMicId] = useState('')
  const [authReady, setAuthReady] = useState(false)
  // Access token guardado em memória para contornar bloqueio de cookies em iframe cross-domain
  const [bearerToken, setBearerToken] = useState<string | null>(null)

  // Lê tokens de auth do hash fragment (passados pela área-secreta no cross-domain iframe)
  // O hash nunca é enviado ao servidor — seguro para tokens de sessão.
  // Persiste em sessionStorage para sobreviver a router.replace entre salas.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const at = hash.get('at')
    const rt = hash.get('rt')

    // Fonte 1: hash fragment (primeiro acesso via iframe)
    if (at) {
      setBearerToken(at)
      try { sessionStorage.setItem('player-bearer', at) } catch {}
      const supabase = createClient()
      supabase.auth
        .setSession({ access_token: at, refresh_token: rt ?? '' })
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname + window.location.search)
          setAuthReady(true)
        })
    } else {
      // Fonte 2: sessionStorage (navegação interna entre salas via handleAtravessar)
      let stored: string | null = null
      try { stored = sessionStorage.getItem('player-bearer') } catch {}
      if (stored) {
        setBearerToken(stored)
        const supabase = createClient()
        supabase.auth
          .setSession({ access_token: stored, refresh_token: '' })
          .finally(() => setAuthReady(true))
      } else {
        setAuthReady(true)
      }
    }
  }, [])

  function authHeaders(): HeadersInit {
    return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}
  }

  // Carrega dados da sessão (salas + counts) após auth estar pronta
  useEffect(() => {
    if (!authReady) return
    fetch(`/api/sessions/${sessionId}/counts`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setSessionData(data))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, authReady])

  async function fetchToken(): Promise<TokenResponse | null> {
    const res = await fetch(`/api/sessions/${sessionId}/rooms/${roomId}/token`, {
      method: 'POST',
      headers: { 'X-Player-Client': '1', ...authHeaders() },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const reason = body.reason as string | undefined

      if (reason === 'full') setErrorMsg('Esta sala está cheia. Escolha outra.')
      else if (res.status === 409 && reason === 'not_yet_open') setErrorMsg('O encontro ainda não abriu.')
      else if (res.status === 410) setErrorMsg('Este encontro foi encerrado.')
      else if (res.status === 401) setErrorMsg('Faça login na área secreta para acessar.')
      else setErrorMsg(`Algo deu errado. (${res.status}: ${body.error ?? 'erro desconhecido'})`)

      setPhase('error')
      return null
    }

    return res.json()
  }

  async function handleEnter({ withCamera, withMic, videoDeviceId }: { withCamera: boolean; withMic: boolean; videoDeviceId?: string }) {
    setEnterCam(withCamera)
    setEnterMic(withMic)
    setEnterCamId(videoDeviceId ?? '')
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

  // skipPreview: vai direto buscar token após auth estar pronta, restaurando
  // mic/câmera e device IDs da sala anterior via sessionStorage
  useEffect(() => {
    if (!authReady || !skipPreview) return
    const prefs = getDevicePrefs()
    setEnterCam(prefs.camOn)
    setEnterMic(prefs.micOn)
    setEnterCamId(prefs.camId)
    setEnterMicId(prefs.micId)
    setPhase('entering')
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

  // Avisa o parent (area-secreta) que a sala está pronta para exibição.
  // O parent mantém o modal de transição visível até receber este sinal.
  useEffect(() => {
    if (phase === 'incall') {
      window.parent.postMessage({ type: 'player:ready' }, '*')
    }
  }, [phase])

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
    const room = sessionData?.allRooms?.find(r => r.id === roomId)

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
    const currentRoom = sessionData.allRooms?.find(r => r.id === roomId) ?? {
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
        initialCamId={enterCamId || undefined}
        initialMicId={enterMicId || undefined}
        bearerToken={bearerToken}
      />
    )
  }

  return <LoadingSpinner />
}

// Suspense obrigatório para useSearchParams() em Next.js 15+
export function RoomPageClient({ sessionId, roomId }: Props) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RoomPageInner sessionId={sessionId} roomId={roomId} />
    </Suspense>
  )
}
