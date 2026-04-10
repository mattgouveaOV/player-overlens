interface LogoProps {
  size?: 'sm' | 'md'
  className?: string
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const h = size === 'sm' ? 28 : 36
  const w = Math.round(h * (28 / 39))

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/symbol-light.svg"
      alt="Overlens"
      width={w}
      height={h}
      className={className}
    />
  )
}
