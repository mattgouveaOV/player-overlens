'use client'

import { useEffect, useRef, useState } from 'react'
import { useMaybeRoomContext } from '@livekit/components-react'
import { Track, RoomEvent } from 'livekit-client'
import type { LocalAudioTrack, Room } from 'livekit-client'
import { Settings, X } from 'lucide-react'
import { getDevicePrefs, setDevicePref } from '@/lib/device-prefs'

interface DeviceOption {
  deviceId: string
  label: string
}

const MIRROR_KEY = 'player-mirror-local'
const ECHO_MODE_KEY = 'player-echo-mode'

type EchoMode = 'off' | 'light' | 'high'

async function applyEchoMode(room: Room, mode: EchoMode) {
  const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
  const track = pub?.audioTrack as LocalAudioTrack | undefined
  if (!track) return

  if (mode === 'off') {
    await track.stopProcessor()
    return
  }

  const { KrispNoiseFilter } = await import('@livekit/krisp-noise-filter')
  const quality = mode === 'light' ? 'low' : 'medium'
  await track.setProcessor(
    KrispNoiseFilter({
      quality,
      onBufferDrop: () => {
        console.warn(`[krisp] buffer drop in ${quality} mode`)
      },
    }),
  )
}

export function SettingsMenu() {
  const room = useMaybeRoomContext()
  const [open, setOpen] = useState(false)
  const [cameras, setCameras] = useState<DeviceOption[]>([])
  const [mics, setMics] = useState<DeviceOption[]>([])
  const [speakers, setSpeakers] = useState<DeviceOption[]>([])
  const [selectedCam, setSelectedCam] = useState(() => getDevicePrefs().camId)
  const [selectedMic, setSelectedMic] = useState(() => getDevicePrefs().micId)
  const [selectedSpeaker, setSelectedSpeaker] = useState(() => getDevicePrefs().speakerId)
  const [mirrorLocal, setMirrorLocal] = useState(false)
  const [echoMode, setEchoMode] = useState<EchoMode>('off')
  const [echoBusy, setEchoBusy] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Hidrata preferência de mirror do localStorage e aplica no <html>
  useEffect(() => {
    const saved = typeof window !== 'undefined' && window.localStorage.getItem(MIRROR_KEY) === '1'
    setMirrorLocal(saved)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-mirror-local', saved ? '1' : '0')
    }
  }, [])

  // Hidrata modo de cancelamento de eco
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(ECHO_MODE_KEY) : null
    if (saved === 'light' || saved === 'high') setEchoMode(saved)
  }, [])

  // Re-aplica processor quando room conecta (ou muda) e o modo não é 'off'
  // Também re-aplica ao publicar novo track de mic (troca de dispositivo)
  useEffect(() => {
    if (!room || echoMode === 'off') return
    let cancelled = false
    applyEchoMode(room, echoMode).catch(err => console.error('[settings] echo apply:', err))

    const onPublished = (pub: { source?: Track.Source }) => {
      if (cancelled) return
      if (pub.source === Track.Source.Microphone) {
        applyEchoMode(room, echoMode).catch(() => {})
      }
    }
    room.on(RoomEvent.LocalTrackPublished, onPublished)
    return () => {
      cancelled = true
      room.off(RoomEvent.LocalTrackPublished, onPublished)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, echoMode])

  // Enumera dispositivos (precisa de permissão já concedida)
  useEffect(() => {
    if (!open) return
    navigator.mediaDevices
      .enumerateDevices()
      .then(devices => {
        setCameras(
          devices
            .filter(d => d.kind === 'videoinput')
            .map(d => ({ deviceId: d.deviceId, label: d.label || 'Câmera' }))
        )
        setMics(
          devices
            .filter(d => d.kind === 'audioinput')
            .map(d => ({ deviceId: d.deviceId, label: d.label || 'Microfone' }))
        )
        setSpeakers(
          devices
            .filter(d => d.kind === 'audiooutput')
            .map(d => ({ deviceId: d.deviceId, label: d.label || 'Alto-falante' }))
        )
      })
      .catch(() => {})
  }, [open])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function handleCamChange(deviceId: string) {
    setSelectedCam(deviceId)
    setDevicePref('camId', deviceId)
    if (!room) return
    try {
      await room.switchActiveDevice('videoinput', deviceId)
    } catch (err) {
      console.error('[settings] switch camera:', err)
    }
  }

  async function handleMicChange(deviceId: string) {
    setSelectedMic(deviceId)
    setDevicePref('micId', deviceId)
    if (!room) return
    try {
      await room.switchActiveDevice('audioinput', deviceId)
    } catch (err) {
      console.error('[settings] switch mic:', err)
    }
  }

  async function handleSpeakerChange(deviceId: string) {
    setSelectedSpeaker(deviceId)
    setDevicePref('speakerId', deviceId)
    if (!room) return
    try {
      await room.switchActiveDevice('audiooutput', deviceId)
    } catch (err) {
      console.error('[settings] switch speaker:', err)
    }
  }

  async function handleEchoChange(next: EchoMode) {
    if (!room || echoBusy || next === echoMode) return
    setEchoBusy(true)
    try {
      await applyEchoMode(room, next)
      setEchoMode(next)
      window.localStorage.setItem(ECHO_MODE_KEY, next)
    } catch (err) {
      console.error('[settings] echo change:', err)
    } finally {
      setEchoBusy(false)
    }
  }

  function toggleMirror() {
    const next = !mirrorLocal
    setMirrorLocal(next)
    window.localStorage.setItem(MIRROR_KEY, next ? '1' : '0')
    document.documentElement.setAttribute('data-mirror-local', next ? '1' : '0')
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Configurações"
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          border transition-all duration-150 cursor-pointer
          ${open
            ? 'bg-[var(--surface-2)] border-zinc-600 text-[var(--text-primary)]'
            : 'bg-[var(--surface-1)] border-zinc-800 text-[var(--text-subtle)]'
          }
          hover:border-zinc-500 hover:text-[var(--text-primary)]
        `}
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute bottom-12 right-0 z-50 w-80 rounded-xl border border-zinc-800 bg-[var(--surface-1)] shadow-xl p-4 space-y-4"
          role="dialog"
          aria-label="Configurações"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-subtle)]">
              Configurações
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {cameras.length > 0 && (
            <DeviceSelect
              label="Câmera"
              value={selectedCam || cameras[0]?.deviceId}
              options={cameras}
              onChange={handleCamChange}
            />
          )}

          {mics.length > 0 && (
            <DeviceSelect
              label="Microfone"
              value={selectedMic || mics[0]?.deviceId}
              options={mics}
              onChange={handleMicChange}
            />
          )}

          {speakers.length > 0 && (
            <DeviceSelect
              label="Alto-falante"
              value={selectedSpeaker || speakers[0]?.deviceId}
              options={speakers}
              onChange={handleSpeakerChange}
            />
          )}

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-[var(--text-muted)]">Espelhar meu vídeo</span>
            <input
              type="checkbox"
              checked={mirrorLocal}
              onChange={toggleMirror}
              className="w-4 h-4 rounded border-zinc-700 bg-[var(--surface-2)] cursor-pointer"
            />
          </label>
          <p className="text-[10px] text-[var(--text-subtle)] -mt-2">
            Afeta apenas como você se vê. Os outros participantes veem seu vídeo normal.
          </p>

          <div className="border-t border-zinc-800 pt-4 space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-subtle)]">
              Cancelamento de eco
            </label>
            <select
              value={echoMode}
              onChange={e => handleEchoChange(e.target.value as EchoMode)}
              disabled={echoBusy || !room}
              className="w-full rounded-lg border border-zinc-800 bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-zinc-600 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="off">Desligado (padrão — use fones)</option>
              <option value="light">Leve — equilíbrio eco e performance</option>
              <option value="high">Alto — pode pesar em máquinas lentas</option>
            </select>
            <p className="text-[10px] text-[var(--text-subtle)] leading-snug">
              Com fones, deixe Desligado. Com caixinha de som, experimente Leve.
              Se travar ou sair de sincronia, volte para Desligado.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function DeviceSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: DeviceOption[]
  onChange: (deviceId: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-subtle)]">
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-zinc-600 focus:outline-none cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.deviceId} value={opt.deviceId}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
