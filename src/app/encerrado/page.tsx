import { Logo } from '@/components/brand/logo'
import { copy } from '@/lib/copy'

export default function EncerradoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo size="md" className="opacity-60" />
        </div>

        <h1 className="text-lg text-[var(--text-primary)] mb-10 leading-relaxed">
          {copy.encerrado.title}
        </h1>

        {/* Reflexão — placeholder v1.1 */}
        {/*
        <div className="mb-8 text-left">
          <p className="text-sm text-[var(--text-muted)] mb-3">{copy.encerrado.reflection}</p>
          <textarea
            className="w-full bg-[var(--surface-1)] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-zinc-600 resize-none"
            rows={3}
            placeholder={copy.encerrado.reflectionPlaceholder}
          />
          <div className="flex gap-2 mt-3">
            <button className="...">{copy.encerrado.save}</button>
            <button className="...">{copy.encerrado.skip}</button>
          </div>
        </div>
        */}

        <a
          href={process.env.NEXT_PUBLIC_AREA_SECRETA_URL}
          className="text-sm text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
        >
          {copy.encerrado.backToAreaSecreta} →
        </a>
      </div>
    </main>
  )
}
