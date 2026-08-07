"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search, Building, Video, Trash2 } from "lucide-react"
import { EVENT_PRESETS, type EventPresetId } from "@/lib/constants"
import { DateTimePicker } from "@/components/date-time-picker"
import { searchAutoscuole, setFollowUp } from "@/lib/actions/autoscuole"
import { createCalendarEvent } from "@/lib/actions/calendar"

export type EventFormAutoscuola = {
  id: string
  name: string
  town?: string
  province?: string
  email?: string | null
}

export type EventFormSalesUser = {
  id: string
  name: string
  color?: string | null
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Stato + logica condivisi tra il popover del Calendario e il MeetingDialog della pipeline.
export function useEventForm(opts?: {
  lockedAutoscuola?: EventFormAutoscuola | null
  defaultStart?: string
  defaultEnd?: string
  defaultPreset?: EventPresetId
}) {
  const locked = opts?.lockedAutoscuola ?? null
  const defaultPreset: EventPresetId = opts?.defaultPreset ?? "custom"

  const [preset, setPresetState] = useState<EventPresetId>(defaultPreset)
  const [autoscuola, setAutoscuola] = useState<EventFormAutoscuola | null>(locked)
  const [autoscuolaText, setAutoscuolaText] = useState(locked?.name ?? "")
  const [title, setTitle] = useState("")
  const [start, setStart] = useState(() => {
    if (opts?.defaultStart) return toLocalISOString(new Date(opts.defaultStart))
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
    return toLocalISOString(now)
  })
  const [end, setEnd] = useState(() => {
    if (opts?.defaultEnd) return toLocalISOString(new Date(opts.defaultEnd))
    const now = new Date()
    const duration = EVENT_PRESETS.find((p) => p.id === defaultPreset)?.duration ?? 60
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15 + duration, 0, 0)
    return toLocalISOString(now)
  })
  const [guests, setGuests] = useState<string[]>(locked?.email ? [locked.email] : [])
  const [addMeetLink, setAddMeetLink] = useState(
    EVENT_PRESETS.find((p) => p.id === defaultPreset)?.meet ?? true
  )
  const [notes, setNotes] = useState("")
  const [forUser, setForUser] = useState<string | null>(null)

  // Titolo auto-generato per i preset non-custom
  const computedTitle =
    preset === "custom"
      ? null
      : EVENT_PRESETS.find((p) => p.id === preset)!.titleTemplate.replace("{autoscuola}", autoscuolaText.trim())

  const applyPreset = useCallback(
    (presetId: EventPresetId) => {
      const p = EVENT_PRESETS.find((x) => x.id === presetId)!
      setPresetState(presetId)
      setAddMeetLink(p.meet)
      setEnd((prevEnd) => {
        void prevEnd
        const startDate = new Date(start.replace("T", " "))
        return toLocalISOString(new Date(startDate.getTime() + p.duration * 60 * 1000))
      })
    },
    [start]
  )

  const selectAutoscuola = useCallback((result: EventFormAutoscuola) => {
    setAutoscuola(result)
    setAutoscuolaText(result.name)
    if (result.email) {
      setGuests((prev) => (prev.includes(result.email!) ? prev : [...prev, result.email!]))
    }
  }, [])

  const changeAutoscuolaText = useCallback(
    (text: string) => {
      if (autoscuola && text !== autoscuola.name) {
        if (autoscuola.email) {
          setGuests((prev) => prev.filter((g) => g !== autoscuola.email))
        }
        setAutoscuola(null)
      }
      setAutoscuolaText(text)
    },
    [autoscuola]
  )

  const isFollowUp = preset === "follow_up"
  const canSubmit = isFollowUp ? autoscuola !== null : true

  // Stessa semantica del popover Calendario: follow-up → setFollowUp, altrimenti createCalendarEvent.
  const submit = useCallback(async () => {
    if (isFollowUp && autoscuola) {
      await setFollowUp(autoscuola.id, new Date(start.replace("T", " ")).toISOString())
      return { kind: "followup" as const }
    }
    const finalTitle =
      preset !== "custom" ? (computedTitle?.trim() || "Nuovo evento") : (title.trim() || "Nuovo evento")
    const res = await createCalendarEvent({
      title: finalTitle,
      description: notes || undefined,
      startDateTime: new Date(start.replace("T", " ")).toISOString(),
      endDateTime: new Date(end.replace("T", " ")).toISOString(),
      guests,
      addMeetLink,
      autoscuolaId: autoscuola?.id,
      forUserId: forUser ?? undefined,
    })
    return { kind: "event" as const, ...res }
  }, [isFollowUp, autoscuola, preset, computedTitle, title, notes, start, end, guests, addMeetLink, forUser])

  return {
    preset,
    applyPreset,
    autoscuola,
    autoscuolaText,
    selectAutoscuola,
    changeAutoscuolaText,
    title,
    setTitle,
    computedTitle,
    start,
    setStart,
    end,
    setEnd,
    guests,
    setGuests,
    addMeetLink,
    setAddMeetLink,
    notes,
    setNotes,
    forUser,
    setForUser,
    isFollowUp,
    canSubmit,
    submit,
    lockedAutoscuola: locked,
  }
}

export type EventForm = ReturnType<typeof useEventForm>

// Campi del form evento — stesso layout/comportamento del popover di creazione del Calendario.
export function EventFormFields({
  form,
  salesUsers = [],
  currentUserName,
  onSubmit,
}: {
  form: EventForm
  salesUsers?: EventFormSalesUser[]
  currentUserName?: string
  onSubmit?: () => void
}) {
  const [guestInput, setGuestInput] = useState("")
  const [results, setResults] = useState<EventFormAutoscuola[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Ricerca autoscuola con debounce — disattivata quando la scheda è bloccata o già selezionata
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (form.lockedAutoscuola || form.autoscuola || form.autoscuolaText.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    searchTimeout.current = setTimeout(async () => {
      const r = await searchAutoscuole(form.autoscuolaText)
      setResults(r)
      setShowDropdown(r.length > 0)
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [form.autoscuolaText, form.autoscuola, form.lockedAutoscuola])

  useEffect(() => {
    if (!showDropdown) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showDropdown])

  function addGuest() {
    const email = guestInput.trim()
    if (email && email.includes("@") && !form.guests.includes(email)) {
      form.setGuests([...form.guests, email])
      setGuestInput("")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Owner selector — visibile solo agli admin (salesUsers vuoto per i sales) */}
      {salesUsers.length > 0 && (
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Calendario di</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => form.setForUser(null)}
              className="rounded-[999px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
              style={{
                backgroundColor: !form.forUser ? "#1a1a2e" : "#f7f7f7",
                color: !form.forUser ? "white" : "#6a6a6a",
              }}
            >
              {currentUserName?.split(" ")[0] ?? "Tu"} (tu)
            </button>
            {salesUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => form.setForUser(u.id)}
                className="rounded-[999px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
                style={{
                  backgroundColor: form.forUser === u.id ? (u.color ?? "#6a6a6a") : "#f7f7f7",
                  color: form.forUser === u.id ? "white" : "#6a6a6a",
                }}
              >
                {u.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preset pills */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Tipo evento</label>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => form.applyPreset(preset.id)}
              className={`h-7 cursor-pointer rounded-[999px] border px-3 text-[11.5px] font-semibold transition-all ${
                form.preset === preset.id
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border-1 text-ink-500 hover:bg-surface-2"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Autoscuola combobox — bloccata quando aperta dal dettaglio autoscuola */}
      <div ref={dropdownRef} className="relative">
        <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Autoscuola</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={form.autoscuolaText}
            onChange={(e) => form.changeAutoscuolaText(e.target.value)}
            disabled={!!form.lockedAutoscuola}
            placeholder="Nome autoscuola (facoltativo)"
            className={`h-[38px] w-full rounded-[10px] border bg-surface pl-9 pr-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-surface-2 ${
              form.autoscuola ? "border-brand/40" : "border-border-1"
            }`}
          />
          {form.autoscuola && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[4px] bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
              Collegata
            </span>
          )}
        </div>
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[200px] overflow-y-auto rounded-[12px] border border-border-1 bg-surface shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  form.selectAutoscuola(r)
                  setShowDropdown(false)
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <Building className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink-900">{r.name}</p>
                  <p className="text-[11px] text-ink-400">{r.town}, {r.province}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Titolo — solo per il preset "Personalizzato" */}
      {form.preset === "custom" && (
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Titolo</label>
          <input
            value={form.title}
            onChange={(e) => form.setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) onSubmit?.() }}
            placeholder="Meeting con…"
            className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      )}

      {/* Date/time */}
      <div className="grid grid-cols-2 gap-3">
        <DateTimePicker
          label="Inizio"
          value={form.start}
          onChange={(v) => {
            const newStart = new Date(v.replace("T", " "))
            const oldDuration = new Date(form.end.replace("T", " ")).getTime() - new Date(form.start.replace("T", " ")).getTime()
            form.setStart(v)
            form.setEnd(toLocalISOString(new Date(newStart.getTime() + oldDuration)))
          }}
        />
        <DateTimePicker label="Fine" value={form.end} onChange={(v) => form.setEnd(v)} />
      </div>

      {/* Follow-up hint */}
      {form.isFollowUp && (
        <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          Il follow-up verrà creato come attività su Google Calendar{form.autoscuola ? "" : " — seleziona un'autoscuola"}.
        </p>
      )}

      {/* Ospiti / Meet / Note — nascosti per il follow-up */}
      {!form.isFollowUp && (
        <>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Ospiti</label>
            <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-border-1 bg-surface p-2">
              {form.guests.map((g) => (
                <span
                  key={g}
                  className="flex items-center gap-1 rounded-[6px] bg-surface-2 px-2 py-1 text-[12px] text-ink-700"
                >
                  {g}
                  <button
                    type="button"
                    onClick={() => form.setGuests(form.guests.filter((x) => x !== g))}
                    className="text-ink-400 hover:text-red"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addGuest()
                  }
                }}
                onBlur={addGuest}
                placeholder={form.guests.length === 0 ? "email@esempio.com" : ""}
                className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[12.5px] text-ink-900 outline-none placeholder:text-ink-400"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <div
              onClick={() => form.setAddMeetLink(!form.addMeetLink)}
              className="flex h-5 w-9 items-center rounded-full p-0.5 transition-colors"
              style={{ backgroundColor: form.addMeetLink ? "#1a1a2e" : "#dddddd" }}
            >
              <div
                className="h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: form.addMeetLink ? "translateX(16px)" : "translateX(0)" }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-ink-500" />
              <span className="text-[13px] font-medium text-ink-700">Crea link Google Meet</span>
            </div>
          </label>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Note (opzionale)</label>
            <textarea
              value={form.notes}
              onChange={(e) => form.setNotes(e.target.value)}
              placeholder="Aggiungi dettagli…"
              rows={3}
              className="w-full resize-none rounded-[10px] border border-border-1 bg-surface p-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </>
      )}
    </div>
  )
}
