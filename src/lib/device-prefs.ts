// Persists mic/camera state in sessionStorage so it survives room-to-room
// navigation within the same Player session, but resets automatically when
// the user closes the tab or the iframe.

const KEYS = {
  camOn: 'player-cam-on',
  micOn: 'player-mic-on',
  camId: 'player-cam-id',
  micId: 'player-mic-id',
  speakerId: 'player-speaker-id',
} as const

export interface DevicePrefs {
  camOn: boolean
  micOn: boolean
  camId: string
  micId: string
  speakerId: string
}

function ss(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

export function getDevicePrefs(): DevicePrefs {
  const s = ss()
  return {
    camOn: s?.getItem(KEYS.camOn) === 'true',
    micOn: s?.getItem(KEYS.micOn) === 'true',
    camId: s?.getItem(KEYS.camId) ?? '',
    micId: s?.getItem(KEYS.micId) ?? '',
    speakerId: s?.getItem(KEYS.speakerId) ?? '',
  }
}

export function setDevicePref(key: keyof typeof KEYS, value: string): void {
  try {
    ss()?.setItem(KEYS[key], value)
  } catch {
    // browsers that block storage — fail silently, fall back to defaults
  }
}

export function clearDevicePrefs(): void {
  const s = ss()
  if (!s) return
  try {
    Object.values(KEYS).forEach(k => s.removeItem(k))
  } catch {
    // silencia
  }
}
