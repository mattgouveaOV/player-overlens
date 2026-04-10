'use client'

export default function RoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-[var(--text-muted)] text-sm mb-2">Erro ao carregar a sala</p>
        <p className="text-zinc-600 text-xs mb-6 break-all">
          {error.message ?? 'Erro desconhecido'}
          {error.digest ? ` (${error.digest})` : ''}
        </p>
        <button
          onClick={reset}
          className="text-sm text-[var(--brand-amber)] hover:underline cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
