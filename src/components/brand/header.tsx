import { Logo } from './logo'

interface HeaderProps {
  title?: string
  right?: React.ReactNode
}

export function Header({ title, right }: HeaderProps) {
  return (
    <header className="h-14 px-4 flex items-center justify-between border-b border-zinc-800 bg-[var(--background)]">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        {title && (
          <>
            <span className="text-zinc-700">|</span>
            <span className="text-sm text-[var(--text-muted)] font-display uppercase tracking-wide">
              {title}
            </span>
          </>
        )}
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </header>
  )
}
