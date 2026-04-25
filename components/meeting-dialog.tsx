"use client"

import { useState, useTransition } from "react"
import { X, Video, Plus, Trash2 } from "lucide-react"
import { createCalendarEvent } from "@/lib/actions/calendar"
import { DateTimePicker } from "@/components/date-time-picker"
import { GoogleConnectCard } from "@/components/google-connect-card"

type MeetingDialogProps = {
  onClose: () => void
  onCreated?: (result: { meetLink: string | null; htmlLink: string }) => void
  defaultTitle?: string
  defaultGuests?: string[]
  defaultStart?: string
  defaultEnd?: string
  autoscuolaId?: string
  googleConnected?: boolean
}

export function MeetingDialog({
  onClose,
  onCreated,
  defaultTitle = "",
  defaultGuests = [],
  defaultStart,
  defaultEnd,
  autoscuolaId,
  googleConnected = true,
}: MeetingDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(defaultTitle)
  const [startDateTime, setStartDateTime] = useState(() => {
    if (defaultStart) return toLocalISOString(new Date(defaultStart))
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
    return toLocalISOString(now)
  })
  const [endDateTime, setEndDateTime] = useState(() => {
    if (defaultEnd) return toLocalISOString(new Date(defaultEnd))
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15 + 30, 0, 0)
    return toLocalISOString(now)
  })
  const [guests, setGuests] = useState<string[]>(defaultGuests.filter(Boolean))
  const [guestInput, setGuestInput] = useState("")
  const [addMeetLink, setAddMeetLink] = useState(true)
  const [notes, setNotes] = useState("")
  const [result, setResult] = useState<{ meetLink: string | null; htmlLink: string } | null>(null)
  const [error, setError] = useState("")

  function addGuest() {
    const email = guestInput.trim()
    if (email && email.includes("@") && !guests.includes(email)) {
      setGuests([...guests, email])
      setGuestInput("")
    }
  }

  function removeGuest(email: string) {
    setGuests(guests.filter((g) => g !== email))
  }

  function handleGuestKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addGuest()
    }
  }

  function handleSubmit() {
    if (!title.trim()) return
    setError("")

    startTransition(async () => {
      try {
        // Convert local datetime to ISO with timezone
        const startISO = new Date(startDateTime).toISOString()
        const endISO = new Date(endDateTime).toISOString()

        const res = await createCalendarEvent({
          title: title.trim(),
          description: notes || undefined,
          startDateTime: startISO,
          endDateTime: endISO,
          guests,
          addMeetLink,
          autoscuolaId,
        })
        setResult(res)
        onCreated?.(res)
      } catch {
        setError("Errore nella creazione dell'evento. Riprova.")
      }
    })
  }

  if (!googleConnected) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-[460px]" onClick={(e) => e.stopPropagation()}>
          <GoogleConnectCard callbackUrl={autoscuolaId ? `/autoscuola/${autoscuolaId}` : "/calendario"} />
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-[420px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green/10">
            <Video className="h-6 w-6 text-green" />
          </div>
          <h2 className="mb-1 text-[18px] font-bold text-ink-900">Evento creato!</h2>
          <p className="mb-4 text-[13px] text-ink-500">L'evento è stato aggiunto al tuo Google Calendar.</p>

          {result.meetLink && (
            <div className="mb-4 rounded-[10px] bg-surface-2 p-3">
              <p className="mb-1 text-[11.5px] font-semibold text-ink-400">Link Google Meet</p>
              <a
                href={result.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[13px] font-medium text-pink hover:underline"
              >
                {result.meetLink}
              </a>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <a
              href={result.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
            >
              Apri in Google Calendar
            </a>
            <button
              onClick={onClose}
              className="h-9 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">Nuovo meeting</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-surface-2 hover:text-ink-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Titolo</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting con…"
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
            />
          </div>

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-3">
            <DateTimePicker
              label="Inizio"
              value={startDateTime}
              onChange={(v) => {
                setStartDateTime(v)
                const start = new Date(v.replace("T", " "))
                start.setMinutes(start.getMinutes() + 30)
                setEndDateTime(toLocalISOString(start))
              }}
            />
            <DateTimePicker
              label="Fine"
              value={endDateTime}
              onChange={(v) => setEndDateTime(v)}
            />
          </div>

          {/* Guests */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Ospiti</label>
            <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-border-1 bg-surface p-2">
              {guests.map((g) => (
                <span
                  key={g}
                  className="flex items-center gap-1 rounded-[6px] bg-surface-2 px-2 py-1 text-[12px] text-ink-700"
                >
                  {g}
                  <button onClick={() => removeGuest(g)} className="text-ink-400 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={handleGuestKeyDown}
                onBlur={addGuest}
                placeholder={guests.length === 0 ? "email@esempio.com" : ""}
                className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[12.5px] text-ink-900 outline-none placeholder:text-ink-400"
              />
            </div>
          </div>

          {/* Meet link toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <div
              onClick={() => setAddMeetLink(!addMeetLink)}
              className="flex h-5 w-9 items-center rounded-full p-0.5 transition-colors"
              style={{ backgroundColor: addMeetLink ? "#EC4899" : "#CBD5E1" }}
            >
              <div
                className="h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: addMeetLink ? "translateX(16px)" : "translateX(0)" }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-ink-500" />
              <span className="text-[13px] font-medium text-ink-700">Crea link Google Meet</span>
            </div>
          </label>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi dettagli…"
              rows={3}
              className="w-full resize-none rounded-[10px] border border-border-1 bg-surface p-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
            />
          </div>

          {error && (
            <p className="text-[12.5px] font-medium text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isPending}
              className="flex h-9 items-center gap-1.5 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
            >
              {isPending ? "Creazione..." : "Crea evento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
