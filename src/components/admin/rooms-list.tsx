'use client'

import { useState } from 'react'
import { Trash2, GripVertical, Plus } from 'lucide-react'
import { copy } from '@/lib/copy'

interface RoomInput {
  id: string
  name: string
  description: string
  anchor_prompt: string
  max_members: number
  cover_url: string
  sort_order: number
}

interface RoomsListProps {
  rooms: RoomInput[]
  onChange: (rooms: RoomInput[]) => void
}

function makeEmpty(sortOrder: number): RoomInput {
  return {
    id: `local_${Date.now()}_${Math.random()}`,
    name: '',
    description: '',
    anchor_prompt: '',
    max_members: 8,
    cover_url: '',
    sort_order: sortOrder,
  }
}

export function RoomsList({ rooms, onChange }: RoomsListProps) {
  function addRoom() {
    onChange([...rooms, makeEmpty(rooms.length)])
  }

  function removeRoom(id: string) {
    onChange(rooms.filter(r => r.id !== id))
  }

  function updateRoom(id: string, patch: Partial<RoomInput>) {
    onChange(rooms.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  return (
    <div className="space-y-3">
      {rooms.map((room, idx) => (
        <div
          key={room.id}
          className="bg-[var(--surface-1)] border border-zinc-800 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-zinc-700" />
              <span className="text-xs text-[var(--text-subtle)] font-mono">Sala {idx + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeRoom(room.id)}
              className="text-zinc-700 hover:text-[var(--brand-red)] transition-colors cursor-pointer"
              title={copy.admin.removeRoom}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RoomField label={copy.admin.fields.roomName}>
              <input
                type="text"
                value={room.name}
                onChange={e => updateRoom(room.id, { name: e.target.value })}
                placeholder="Ex: Atravessar o próprio ciclo"
                className="room-input"
              />
            </RoomField>
            <RoomField label={copy.admin.fields.maxMembers}>
              <input
                type="number"
                value={room.max_members}
                onChange={e => updateRoom(room.id, { max_members: Number(e.target.value) })}
                min={1}
                max={50}
                className="room-input"
              />
            </RoomField>
          </div>

          <RoomField label={copy.admin.fields.roomDescription}>
            <input
              type="text"
              value={room.description}
              onChange={e => updateRoom(room.id, { description: e.target.value })}
              placeholder="2 linhas sobre o que acontece aqui"
              className="room-input"
            />
          </RoomField>

          <RoomField
            label={copy.admin.fields.anchorPrompt}
            hint={copy.admin.fields.anchorPromptHint}
            required
          >
            <textarea
              value={room.anchor_prompt}
              onChange={e => updateRoom(room.id, { anchor_prompt: e.target.value })}
              placeholder='Ex: "Conversamos sobre o que muda quando o ciclo pede outro gesto."'
              rows={2}
              className="room-input resize-none"
            />
          </RoomField>

          <RoomField label={copy.admin.fields.coverUrl}>
            <input
              type="url"
              value={room.cover_url}
              onChange={e => updateRoom(room.id, { cover_url: e.target.value })}
              placeholder="https://..."
              className="room-input"
            />
          </RoomField>
        </div>
      ))}

      <button
        type="button"
        onClick={addRoom}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-zinc-700 rounded-xl text-sm text-[var(--text-subtle)] hover:border-zinc-500 hover:text-[var(--text-muted)] transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        {copy.admin.addRoom}
      </button>

      <style>{`
        .room-input {
          width: 100%;
          background: var(--surface-2);
          border: 1px solid rgb(63 63 70);
          border-radius: 0.5rem;
          padding: 0.375rem 0.625rem;
          font-size: 0.8125rem;
          color: var(--text-primary);
          outline: none;
        }
        .room-input:focus { border-color: rgb(113 113 122); }
        .room-input::placeholder { color: var(--text-subtle); }
      `}</style>
    </div>
  )
}

function RoomField({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--text-muted)]">
        {label}
        {required && <span className="text-[var(--brand-amber)] ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="text-[10px] text-[var(--text-subtle)]">{hint}</span>}
    </div>
  )
}
