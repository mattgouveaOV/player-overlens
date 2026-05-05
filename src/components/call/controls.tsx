'use client'

import {
  useLocalParticipant,
  useMaybeRoomContext,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useState } from 'react'
import { Mic, MicOff, Camera, CameraOff, Monitor, MessageSquare, BookOpen, LogOut, Loader2 } from 'lucide-react'
import { copy } from '@/lib/copy'
import { SettingsMenu } from './settings-menu'
import { setDevicePref } from '@/lib/device-prefs'

interface ControlsProps {
  onLeave: () => void
  onToggleChat: () => void
  chatOpen: boolean
  chatUnread?: number
}

export function Controls({
  onLeave,
  onToggleChat,
  chatOpen,
  chatUnread = 0,
}: ControlsProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()
  const room = useMaybeRoomContext()
  const [isLeaving, setIsLeaving] = useState(false)

  const canScreenShare = typeof navigator !== 'undefined' &&
    typeof (navigator.mediaDevices as { getDisplayMedia?: unknown })?.getDisplayMedia === 'function'

  const isScreenSharing = room
    ? localParticipant.getTrackPublications().some(
        p => p.track?.source === Track.Source.ScreenShare
      )
    : false

  async function toggleMic() {
    const next = !isMicrophoneEnabled
    await localParticipant.setMicrophoneEnabled(next)
    setDevicePref('micOn', String(next))
  }

  async function toggleCam() {
    const next = !isCameraEnabled
    await localParticipant.setCameraEnabled(next)
    setDevicePref('camOn', String(next))
  }

  async function toggleScreen() {
    if (isScreenSharing) {
      await localParticipant.setScreenShareEnabled(false)
    } else {
      await localParticipant.setScreenShareEnabled(true)
    }
  }

  async function handleLeave() {
    if (isLeaving) return
    setIsLeaving(true)
    try {
      await onLeave()
    } catch {
      setIsLeaving(false)
    }
  }

  return (
    <div className="h-14 shrink-0 border-t border-zinc-800 bg-[var(--background)] flex items-center justify-center gap-2 px-4">
      {/* Mic */}
      <ControlButton
        active={!!isMicrophoneEnabled}
        muted={!isMicrophoneEnabled}
        onClick={toggleMic}
        label={!isMicrophoneEnabled ? copy.inCall.unmute : copy.inCall.mute}
      >
        {!isMicrophoneEnabled
          ? <MicOff className="w-4 h-4" />
          : <Mic className="w-4 h-4" />
        }
      </ControlButton>

      {/* Câmera */}
      <ControlButton
        active={isCameraEnabled}
        muted={!isCameraEnabled}
        onClick={toggleCam}
        label={isCameraEnabled ? copy.inCall.camOff : copy.inCall.camOn}
      >
        {isCameraEnabled
          ? <Camera className="w-4 h-4" />
          : <CameraOff className="w-4 h-4" />
        }
      </ControlButton>

      {/* Screen share — apenas desktop */}
      {canScreenShare && (
        <ControlButton
          active={isScreenSharing}
          sharing={isScreenSharing}
          onClick={toggleScreen}
          label={isScreenSharing ? copy.inCall.stopShare : copy.inCall.shareScreen}
        >
          <Monitor className="w-4 h-4" />
        </ControlButton>
      )}

      {/* Chat */}
      <ControlButton
        active={chatOpen}
        onClick={onToggleChat}
        label="Chat"
      >
        <div className="relative">
          <MessageSquare className="w-4 h-4" />
          {chatUnread > 0 && !chatOpen && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[var(--brand-amber)] rounded-full text-[9px] text-zinc-950 font-bold flex items-center justify-center">
              {chatUnread > 9 ? '9+' : chatUnread}
            </span>
          )}
        </div>
      </ControlButton>

      {/* Códice — painel de notas pessoais no host (área secreta) */}
      <ControlButton
        active={false}
        onClick={() => {
          if (typeof window !== 'undefined' && window.self !== window.top) {
            window.parent.postMessage({ type: 'player:codice:toggle' }, '*')
          }
        }}
        label="Códice"
      >
        <BookOpen className="w-4 h-4" />
      </ControlButton>

      {/* Configurações — dispositivos + espelhamento */}
      <SettingsMenu />

      {/* Sair */}
      <button
        onClick={handleLeave}
        disabled={isLeaving}
        title={copy.inCall.leave}
        className={`
          ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          text-sm transition-colors cursor-pointer
          ${isLeaving
            ? 'text-[var(--brand-red)] bg-[var(--surface-2)] opacity-70 cursor-wait'
            : 'text-[var(--text-muted)] hover:text-[var(--brand-red)] hover:bg-[var(--surface-2)]'
          }
        `}
      >
        {isLeaving
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <LogOut className="w-4 h-4" />
        }
        {isLeaving ? 'Saindo…' : copy.inCall.leave}
      </button>
    </div>
  )
}

function ControlButton({
  active,
  muted,
  sharing,
  onClick,
  label,
  children,
}: {
  active: boolean
  muted?: boolean
  sharing?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  // Mic/câmera OFF: fundo vermelho sutil, borda e ícone vermelhos
  // Screen share ativo: borda verde
  // Estado ativo normal (mic ON, cam ON, chat aberto): borda clara, ícone branco
  // Estado inativo neutro: cinza sutil
  let classes: string

  if (muted) {
    classes = 'bg-[var(--brand-red)]/15 border-[var(--brand-red)]/40 text-[var(--brand-red-light)] hover:bg-[var(--brand-red)]/25 hover:border-[var(--brand-red)]/60'
  } else if (sharing) {
    classes = 'bg-[var(--brand-green)]/15 border-[var(--brand-green)]/40 text-[var(--brand-green-light)] hover:bg-[var(--brand-green)]/25 hover:border-[var(--brand-green)]/60'
  } else if (active) {
    classes = 'bg-[var(--surface-2)] border-zinc-600 text-[var(--text-primary)] hover:border-zinc-500'
  } else {
    classes = 'bg-[var(--surface-1)] border-zinc-800 text-[var(--text-subtle)] hover:border-zinc-500 hover:text-[var(--text-primary)]'
  }

  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center
        border transition-all duration-150 cursor-pointer
        ${classes}
      `}
    >
      {children}
    </button>
  )
}
