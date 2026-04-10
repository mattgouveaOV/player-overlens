'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#09090b', color: '#a1a1aa', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 16px' }}>
          <p style={{ fontSize: 13, marginBottom: 8 }}>Erro inesperado</p>
          <p style={{ fontSize: 11, color: '#52525b', marginBottom: 16, wordBreak: 'break-all' }}>
            {error.message ?? 'Erro desconhecido'}
            {error.digest ? ` (${error.digest})` : ''}
          </p>
          <button
            onClick={reset}
            style={{ fontSize: 12, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
