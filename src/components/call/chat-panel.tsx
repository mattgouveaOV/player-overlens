'use client'

import { useChat, useLocalParticipant } from '@livekit/components-react'
import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { copy } from '@/lib/copy'

export function ChatPanel() {
  const { chatMessages, send } = useChat()
  const { localParticipant } = useLocalParticipant()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  async function handleSend() {
    const msg = text.trim()
    if (!msg) return
    setText('')
    await send(msg)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mensagens */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat da sala"
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2"
      >
        {chatMessages.length === 0 && (
          <p className="text-xs text-[var(--text-subtle)] text-center py-4">
            Nenhuma mensagem ainda
          </p>
        )}
        {chatMessages.map((msg, i) => {
          const isOwn = msg.from?.identity === localParticipant.identity
          return (
            <div key={i} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-[var(--text-subtle)]">
                {msg.from?.name ?? msg.from?.identity ?? 'Participante'}
              </span>
              <div
                className={`
                  max-w-[90%] px-2.5 py-1.5 rounded-lg text-xs leading-relaxed
                  ${isOwn
                    ? 'bg-[var(--brand-amber)]/15 text-[var(--text-primary)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  }
                `}
              >
                {msg.message}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-2 flex gap-1.5">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={copy.inCall.chatInput.placeholder}
          className="
            flex-1 bg-[var(--surface-2)] border border-zinc-700 rounded-lg
            px-3 py-1.5 text-xs text-[var(--text-primary)]
            placeholder:text-[var(--text-subtle)]
            focus:outline-none focus:border-zinc-500
          "
          maxLength={500}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          title={copy.inCall.chatInput.send}
          className="
            w-8 h-8 flex items-center justify-center rounded-lg
            bg-[var(--surface-2)] text-[var(--text-muted)]
            hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors cursor-pointer
          "
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
