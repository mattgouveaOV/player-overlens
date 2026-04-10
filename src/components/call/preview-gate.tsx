'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromptAnchor } from './prompt-anchor'
import { copy } from '@/lib/copy'

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

  // Câmera e mic OFF por default — princípio do contrato social
  const [camOn, setCamOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [camAvailable, setCamAvailable] = useState(true)

  // Seletor de dispositivo
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  // Enumera câmeras disponíveis (precisa de permissão — só chama após primeira stream)
  async function loadVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter(d => d.kind === 'videoinput')
      setVideoDevices(cams)
      if (cams.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(cams[0].deviceId)
      }
    } catch {
      // silencia — não bloqueia o fluxo
    }
  }

  useEffect(() => {
    if (!camOn) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      return
    }

    const constraints: MediaStreamConstraints = {
      video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      audio: false,
    }

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.muted = true
          videoRef.current.play().catch(() => {})
        }
        // Agora que temos permissão, enumera os dispositivos com labels
        await loadVideoDevices()
      })
      .catch(() => {
        setCamOn(false)
        setCamAvailable(false)
      })

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn, selectedDeviceId])

  function handleDeviceChange(deviceId: string) {
    setSelectedDeviceId(deviceId)
    // O useEffect vai reiniciar a stream com o novo device
    if (camOn) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function handleEnter() {
    streamRef.current?.getTracks().forEach(t => t.stop())
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
            onClick={() => camAvailable && setCamOn(v => !v)}
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
            onClick={() => setMicOn(v => !v)}
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
