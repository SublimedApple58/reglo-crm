"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, GripVertical, Save, X } from "lucide-react"
import { upsertHomeCard, deleteHomeCard, reorderHomeCards } from "@/lib/actions/data"
import type { HomeCard } from "@/lib/db/schema"

export function GestioneHomeClient({ cards: initial }: { cards: HomeCard[] }) {
  const [cards, setCards] = useState(initial)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: number) {
    if (!confirm("Eliminare questa card?")) return
    startTransition(async () => {
      await deleteHomeCard(id)
      setCards((prev) => prev.filter((c) => c.id !== id))
    })
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const updated = [...cards]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setCards(updated)
    startTransition(() => {
      reorderHomeCards(updated.map((c) => c.id))
    })
  }

  function handleMoveDown(index: number) {
    if (index === cards.length - 1) return
    const updated = [...cards]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setCards(updated)
    startTransition(() => {
      reorderHomeCards(updated.map((c) => c.id))
    })
  }

  return (
    <div className="mx-auto max-w-[800px] px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink-900">Gestione Home Cards</h1>
          <p className="text-[13px] text-ink-500">Gestisci le card shortcut nella home page</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-9 items-center gap-1.5 rounded-[999px] bg-pink px-4 text-[13px] font-semibold text-white hover:bg-pink/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuova card
        </button>
      </div>

      <div className="space-y-2">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="flex items-center gap-3 rounded-[14px] border border-border-1 bg-surface px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-[10px] text-ink-400 hover:text-ink-700 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === cards.length - 1}
                className="text-[10px] text-ink-400 hover:text-ink-700 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <span className="text-[20px]">{card.icon ?? "📋"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink-900">{card.title}</p>
              {card.link && <p className="text-[12px] text-ink-400">{card.link}</p>}
            </div>
            <button
              onClick={() => setEditingId(card.id)}
              className="text-[12px] font-medium text-pink hover:underline"
            >
              Modifica
            </button>
            <button
              onClick={() => handleDelete(card.id)}
              disabled={isPending}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="mt-8 text-center text-[14px] text-ink-400">
          Nessuna card. Clicca &quot;Nuova card&quot; per crearne una.
        </div>
      )}

      {/* Create / Edit dialog */}
      {(showCreate || editingId !== null) && (
        <CardFormDialog
          card={editingId !== null ? cards.find((c) => c.id === editingId) ?? null : null}
          onSave={(saved) => {
            if (editingId !== null) {
              setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
            } else {
              setCards((prev) => [...prev, saved])
            }
            setEditingId(null)
            setShowCreate(false)
          }}
          onClose={() => { setEditingId(null); setShowCreate(false) }}
        />
      )}
    </div>
  )
}

function CardFormDialog({
  card,
  onSave,
  onClose,
}: {
  card: HomeCard | null
  onSave: (card: HomeCard) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: card?.title ?? "",
    description: card?.description ?? "",
    icon: card?.icon ?? "",
    color: card?.color ?? "",
    link: card?.link ?? "",
  })
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!form.title.trim()) return
    startTransition(async () => {
      const id = await upsertHomeCard({
        id: card?.id,
        title: form.title,
        description: form.description || undefined,
        icon: form.icon || undefined,
        color: form.color || undefined,
        link: form.link || undefined,
        order: card?.order ?? 0,
      })
      onSave({
        id: card?.id ?? id,
        title: form.title,
        description: form.description || null,
        icon: form.icon || null,
        color: form.color || null,
        link: form.link || null,
        order: card?.order ?? 0,
        createdAt: card?.createdAt ?? new Date(),
      })
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">{card ? "Modifica card" : "Nuova card"}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Titolo *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
              placeholder="Script Chiamate"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Emoji / Icona</label>
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
              placeholder="📞"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Link</label>
            <input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
              placeholder="/risorse?cat=Script+chiamate"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Descrizione</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
              placeholder="Opzionale"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2">
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title.trim() || isPending}
            className="h-9 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
          >
            {isPending ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  )
}
