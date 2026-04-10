'use client'

import {
  useLocalParticipant,
  useMaybeRoomContext,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Mic, MicOff, Camera, CameraOff, Monitor, MessageSquare, LogOut } from 'lucide-react'
import { copy } from '@/lib/copy'

interface ControlsProps {
  onLeave: () => void
  onToggleChat: () => void
  chatOpen: boolean
  chatUnread?: number
}

export function Controls({ onLeave, onToggleChat, chatOpen, chatUnread = 0 }: ControlsProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()
  const room = useMaybeRoomContext()

  const canScreenShare = typeof navigator !== 'undefined' &&
    typeof (navigator.mediaDevices as { getDisplayMedia?: unknown })?.getDisplayMedia === 'function'

  const isScreenSharing = room
    ? localParticipant.getTrackPublications().some(
        p => p.track?.source === Track.Source.ScreenShare
      )
    : false

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!isCameraEnabled)
  }

  async function toggleScreen() {
    if (isScreenSharing) {
      await localParticipant.setScreenShareEnabled(false)
    } else {
      await localParticipant.setScreenShareEnabled(true)
    }
  }

  return (
    <div className="h-14 border-t border-zinc-800 bg-[var(--background)] flex items-center justify-center gap-2 px-4">
      {/* Mic */}
      <ControlButton
        active={!!isMicrophoneEnabled}
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

      {/* Sair */}
      <button
        onClick={onLeave}
        title={copy.inCall.leave}
        className="
          ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          text-sm text-[var(--text-muted)]
          hover:text-[var(--brand-red)] hover:bg-[var(--surface-2)]
          transition-colors cursor-pointer
        "
      >
        <LogOut className="w-4 h-4" />
        {copy.inCall.leave}
      </button>
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center
        border transition-all duration-150 cursor-pointer
        ${active
          ? 'bg-[var(--surface-2)] border-zinc-600 text-[var(--text-primary)]'
          : 'bg-[var(--surface-1)] border-zinc-800 text-[var(--text-subtle)]'
        }
        hover:border-zinc-500 hover:text-[var(--text-primary)]
      `}
    >
      {children}
    </button>
  )
}
