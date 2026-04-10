import { SessionForm } from '@/components/admin/session-form'

export default function NewSessionPage() {
  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-tight text-[var(--text-primary)] mb-8">
        Novo encontro
      </h1>
      <SessionForm />
    </div>
  )
}
