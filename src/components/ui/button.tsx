'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--brand-amber)] text-zinc-950 font-medium hover:bg-[var(--brand-amber-dim)] disabled:opacity-50',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text-primary)] border border-zinc-700 hover:bg-[var(--surface-3)] disabled:opacity-50',
  ghost:
    'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-50',
  danger:
    'text-[var(--brand-red)] hover:bg-[var(--surface-2)] disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          transition-colors duration-150
          cursor-pointer select-none
          focus-visible:outline-2 focus-visible:outline-[var(--brand-amber)] focus-visible:outline-offset-2
          disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
