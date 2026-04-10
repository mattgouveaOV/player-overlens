import { HTMLAttributes } from 'react'

type BadgeVariant = 'live' | 'muted' | 'amber' | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  live:    'bg-[var(--brand-green)]/15 text-[var(--brand-green)] border border-[var(--brand-green)]/30',
  muted:   'bg-[var(--surface-2)] text-[var(--text-muted)] border border-zinc-700',
  amber:   'bg-[var(--brand-amber)]/15 text-[var(--brand-amber)] border border-[var(--brand-amber)]/30',
  default: 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-zinc-700',
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-0.5
        text-xs font-medium rounded-full
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}

/** Bullet pulsante "Ao vivo" */
export function LiveBadge() {
  return (
    <Badge variant="live">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-green)] animate-live-pulse" />
      Ao vivo
    </Badge>
  )
}
