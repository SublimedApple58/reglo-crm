"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function LostReasonDialog({
  autoscuolaName,
  onConfirm,
  onClose,
  isPending = false,
}: {
  autoscuolaName: string
  onConfirm: (reason: string) => void
  onClose: () => void
  isPending?: boolean
}) {
  const [reason, setReason] = useState("")
  const canConfirm = reason.trim().length > 0 && !isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[460px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">Sposta in &ldquo;Non chiuso&rdquo;</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-ink-600">
          Stai spostando <span className="font-semibold text-ink-900">{autoscuolaName.replace("Autoscuola ", "")}</span> in
          &ldquo;Non chiuso&rdquo;. Inserisci la motivazione: serve per analizzare i motivi di perdita e resterà visibile nella scheda.
        </p>

        <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Motivazione *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          autoFocus
          placeholder="Es. ha scelto un altro gestionale, prezzo troppo alto, tempistiche…"
          className="w-full resize-y rounded-[10px] border border-border-1 bg-surface px-3 py-2.5 text-[13px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="h-9 rounded-[999px] px-4 text-[12.5px] font-semibold text-ink-500 transition-colors hover:bg-surface-2"
          >
            Annulla
          </button>
          <button
            onClick={() => canConfirm && onConfirm(reason.trim())}
            disabled={!canConfirm}
            className="h-9 rounded-[999px] bg-brand px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  )
}
