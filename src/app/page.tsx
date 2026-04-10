import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Raiz do Player — detecta sessão live e redireciona.
 * Se não houver sessão live, mostra estado vazio informativo.
 */
export default async function RootPage() {
  const supabase = await createClient()

  // Busca a sessão live ou scheduled mais próxima
  const { data: sessions } = await supabase
    .schema('mentorados')
    .from('study_sessions')
    .select('id, status')
    .in('status', ['live', 'scheduled'])
    .eq('mode' as never, 'player')
    .order('scheduled_at', { ascending: true })
    .limit(1)

  const session = sessions?.[0]

  if (session?.status === 'live') {
    redirect(`/s/${session.id}`)
  }

  if (session?.status === 'scheduled') {
    redirect(`/s/${session.id}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/symbol-light.svg"
            alt="Overlens"
            width={28}
            height={39}
            className="mx-auto opacity-40"
          />
        </div>
        <p className="text-[var(--text-muted)] text-sm">
          Nenhum encontro ativo no momento.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_AREA_SECRETA_URL}
          className="mt-6 inline-block text-sm text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
        >
          Voltar para a área secreta
        </a>
      </div>
    </main>
  )
}
