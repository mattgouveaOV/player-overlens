'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromptAnchor } from './prompt-anchor'
import { copy } from '@/lib/copy'
import { getDevicePrefs, setDevicePref } from '@/lib/device-prefs'

interface PreviewGateProps {
  roomName: string
  anchorPrompt: string | null
  onEnter: (params: { withCamera: boolean; withMic: boolean; videoDeviceId?: string }) => void
  onBack: () => void
  isEntering?: boolean
}

export function PreviewGate({ roomName, anchorPrompt, onEnter, onBack, isEntering }: PreviewGateProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Hidrata a partir das prefs salvas — mantém config da última sala
  const [camOn, setCamOn] = useState(() => getDevicePrefs().camOn)
  const [micOn, setMicOn] = useState(() => getDevicePrefs().micOn)
  const [camAvailable, setCamAvailable] = useState(true)

  // Seletor de dispositivo — inicia com o último device usado
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => getDevicePrefs().camId)

  // Aviso de fones de ouvido — detecta se o usuário parece estar usando caixinhas.
  // Sem fones, o AEC do browser + Krisp ainda podem não segurar dependendo do volume/ganho.
  const [showHeadphoneWarn, setShowHeadphoneWarn] = useState(false)

  // Detecta output de áudio — só funciona com label visível (Chrome expõe após permissão de mic/cam)
  async function checkHeadphones(devices?: MediaDeviceInfo[]) {
    try {
      const all = devices ?? await navigator.mediaDevices.enumerateDevices()
      const outputs = all.filter(d => d.kind === 'audiooutput')
      if (outputs.length === 0) return
      // Se todos os labels estão em branco, não temos info suficiente — avisa por precaução
      const hasLabels = outputs.some(d => d.label.length > 0)
      if (!hasLabels) {
        setShowHeadphoneWarn(true)
        return
      }
      const headphonePattern = /headphone|headset|earpod|airpod|bluetooth|earphone|earbuds|fone|auricular/i
      const hasHeadphones = outputs.some(d => headphonePattern.test(d.label))
      if (!hasHeadphones) setShowHeadphoneWarn(true)
    } catch {
      // silencia
    }
  }

  // Enumera câmeras disponíveis (precisa de permissão — só chama após primeira stream)
  async function loadVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter(d => d.kind === 'videoinput')
      setVideoDevices(cams)
      if (cams.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(cams[0].deviceId)
      }
      // Aproveita a chamada que já tem labels (pós-permissão) para checar headphones
      await checkHeadphones(devices)
    } catch {
      // silencia — não bloqueia o fluxo
    }
  }

  // Verificação inicial + auto-start da câmera se a pref salva estava ligada
  // (funciona em Chrome; no Safari pode falhar sem gesto — nesse caso fica em camOff, sem quebrar)
  useEffect(() => {
    checkHeadphones()
    if (camOn) {
      startCamera(selectedDeviceId || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Abre a câmera — chamado diretamente no click handler para satisfazer
  // o requisito de user-gesture do Safari (getUserMedia deve estar no call stack
  // do evento, senão é rejeitado silenciosamente em iframes cross-origin).
  async function startCamera(deviceId?: string) {
    const constraints: MediaStreamConstraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false,
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.play().catch(() => {})
      }
      setCamOn(true)
      await loadVideoDevices()
    } catch {
      setCamOn(false)
      setCamAvailable(false)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamOn(false)
  }

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  function handleDeviceChange(deviceId: string) {
    setSelectedDeviceId(deviceId)
    setDevicePref('camId', deviceId)
    // Reinicia stream com o novo device (permissão já concedida, não precisa de user gesture)
    if (camOn) {
      stopCamera()
      startCamera(deviceId)
    }
  }

  function handleEnter() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    // Persiste estado final antes de entrar (por segurança, além dos toggles)
    setDevicePref('camOn', String(camOn))
    setDevicePref('micOn', String(micOn))
    setDevicePref('camId', selectedDeviceId)
    onEnter({ withCamera: camOn, withMic: micOn, videoDeviceId: selectedDeviceId || undefined })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Título da sala */}
        <h1 className="font-display text-xl uppercase tracking-wide text-center text-[var(--text-primary)] mb-2">
          {roomName}
        </h1>

        {/* Prompt-âncora */}
        {anchorPrompt && (
          <div className="text-center mb-6">
            <PromptAnchor text={anchorPrompt} />
          </div>
        )}

        {/* Preview vídeo */}
        <div className="relative w-full aspect-video bg-[var(--surface-1)] border border-zinc-800 rounded-xl overflow-hidden mb-4">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ display: camOn ? 'block' : 'none' }}
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                <CameraOff className="w-6 h-6 text-[var(--text-subtle)]" />
              </div>
            </div>
          )}
        </div>

        {/* Seletor de câmera — só aparece se houver 2+ dispositivos e câmera ligada */}
        {camOn && videoDevices.length > 1 && (
          <div className="mb-4">
            <select
              value={selectedDeviceId}
              onChange={e => handleDeviceChange(e.target.value)}
              className="w-full bg-[var(--surface-1)] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-[var(--text-subtle)] focus:outline-none focus:border-zinc-600 cursor-pointer"
            >
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Câmera ${videoDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Controles de dispositivo */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => {
              if (!camAvailable) return
              if (camOn) {
                stopCamera()
                setDevicePref('camOn', 'false')
              } else {
                startCamera(selectedDeviceId || undefined)
                setDevicePref('camOn', 'true')
              }
            }}
            disabled={!camAvailable}
            title={camOn ? 'Desligar câmera' : 'Ligar câmera'}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              border transition-colors duration-150
              ${camOn
                ? 'bg-[var(--surface-2)] border-zinc-600 text-[var(--text-primary)]'
                : 'bg-[var(--surface-1)] border-zinc-700 text-[var(--text-subtle)]'
              }
              ${!camAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setMicOn(v => { const next = !v; setDevicePref('micOn', String(next)); return next })}
            title={micOn ? 'Silenciar' : 'Ativar microfone'}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              border transition-colors duration-150 cursor-pointer
              ${micOn
                ? 'bg-[var(--surface-2)] border-zinc-600 text-[var(--text-primary)]'
                : 'bg-[var(--surface-1)] border-zinc-700 text-[var(--text-subtle)]'
              }
            `}
          >
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Contrato social */}
        <div className="text-center mb-6 space-y-1">
          <p className="text-xs text-[var(--text-subtle)]">
            {copy.previewGate.camOffDefault}
          </p>
          <p className="text-xs text-[var(--text-subtle)]">
            {copy.previewGate.noRecording}
          </p>
        </div>

        {/* Aviso de fones — aparece quando não detectamos headphones no output */}
        {showHeadphoneWarn && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[var(--brand-amber)]/30 bg-[var(--brand-amber)]/8 px-3 py-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--brand-amber)] mt-0.5">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--brand-amber)] font-medium leading-snug">
                Recomendamos fones de ouvido
              </p>
              <p className="text-xs text-[var(--text-subtle)] mt-0.5 leading-snug">
                Com caixinhas, seu áudio pode gerar eco para os outros participantes mesmo com cancelamento ativo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHeadphoneWarn(false)}
              className="shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-muted)] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={onBack} className="flex-1">
            {copy.previewGate.back}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleEnter}
            disabled={isEntering}
            className="flex-2 flex-1"
          >
            {isEntering ? 'Entrando…' : copy.previewGate.enter}
          </Button>
        </div>
      </div>
    </div>
  )
}
