interface PromptAnchorProps {
  text: string
  className?: string
}

/** Prompt-âncora persistente — visível no preview gate e dentro da sala */
export function PromptAnchor({ text, className = '' }: PromptAnchorProps) {
  return (
    <p className={`text-xs text-[var(--text-subtle)] italic leading-relaxed ${className}`}>
      &ldquo;{text}&rdquo;
    </p>
  )
}
