"use client"

import { useState, useCallback, useRef, useEffect, useTransition } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Video, ExternalLink, X, Plus, Users, Calendar, Clock, Trash2, Pencil, Search, Building } from "lucide-react"
import Link from "next/link"
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, rsvpCalendarEvent } from "@/lib/actions/calendar"
import { searchAutoscuole } from "@/lib/actions/autoscuole"
import { EVENT_PRESETS } from "@/lib/constants"
import { DateTimePicker } from "@/components/date-time-picker"
import type { EventClickArg, DatesSetArg, DateSelectArg, EventChangeArg } from "@fullcalendar/core"
import type { EventPresetId } from "@/lib/constants"

const DRAFT_ID = "__draft__"

type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  meetLink: string | null
  htmlLink: string | null
  attendees: { email: string; name: string | null; status: string | null; self: boolean }[]
  description: string | null
  autoscuola: { id: string; name: string } | null
}

type DraftEvent = {
  start: string
  end: string
  title: string
}

type AutoscuolaResult = {
  id: string
  name: string
  town: string
  province: string
  email: string | null
}

export function CalendarioClient({
  initialEvents,
  userEmail,
}: {
  initialEvents: CalendarEvent[]
  userEmail: string
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const [detailDragOffset, setDetailDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [detailEditMode, setDetailEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")
  const [editGuests, setEditGuests] = useState<string[]>([])
  const [editGuestInput, setEditGuestInput] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [isSavingEdit, startSavingEdit] = useTransition()
  const isDraggingDetail = useRef(false)
  const detailPopoverRef = useRef<HTMLDivElement>(null)
  // Draft state
  const [draft, setDraft] = useState<DraftEvent | null>(null)
  const [draftPopoverPos, setDraftPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftGuests, setDraftGuests] = useState<string[]>([])
  const [draftGuestInput, setDraftGuestInput] = useState("")
  const [draftMeetLink, setDraftMeetLink] = useState(true)
  const [draftNotes, setDraftNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const draftTitleRef = useRef<HTMLInputElement>(null)
  const draftPopoverRef = useRef<HTMLDivElement>(null)

  // Preset state
  const [draftPreset, setDraftPreset] = useState<EventPresetId>("custom")

  // Autoscuola combobox state (free text + optional record selection)
  const [draftAutoscuolaText, setDraftAutoscuolaText] = useState("")
  const [draftAutoscuola, setDraftAutoscuola] = useState<AutoscuolaResult | null>(null)
  const [autoscuolaResults, setAutoscuolaResults] = useState<AutoscuolaResult[]>([])
  const [showAutoscuolaDropdown, setShowAutoscuolaDropdown] = useState(false)
  const autoscuolaSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoscuolaDropdownRef = useRef<HTMLDivElement>(null)

  // RSVP state
  const [isRsvpPending, startRsvpTransition] = useTransition()

  const calRef = useRef<FullCalendar>(null)

  const clearDraft = useCallback(() => {
    setDraft(null)
    setDraftPopoverPos(null)
    setDraftTitle("")
    setDraftGuests([])
    setDraftGuestInput("")
    setDraftMeetLink(true)
    setDraftNotes("")
    setDragOffset(null)
    setDraftPreset("custom")
    setDraftAutoscuolaText("")
    setDraftAutoscuola(null)
    setAutoscuolaResults([])
    setShowAutoscuolaDropdown(false)
  }, [])

  // Drag state for popover
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const isDraggingPopover = useRef(false)

  // Position the draft popover next to the draft event element
  const POPOVER_W = 400
  const POPOVER_GAP = 12
  const updateDraftPopoverPos = useCallback(() => {
    const el = document.querySelector(`[data-event-id="${DRAFT_ID}"]`) as HTMLElement | null
    if (!el) return
    const rect = el.getBoundingClientRect()

    // Try right side first; if not enough space, go left
    const spaceRight = window.innerWidth - rect.right - POPOVER_GAP
    const spaceLeft = rect.left - POPOVER_GAP

    let left: number
    if (spaceRight >= POPOVER_W) {
      left = rect.right + POPOVER_GAP
    } else if (spaceLeft >= POPOVER_W) {
      left = rect.left - POPOVER_W - POPOVER_GAP
    } else {
      // Fallback: center on screen
      left = Math.max(8, (window.innerWidth - POPOVER_W) / 2)
    }

    // Clamp top so popover always has room — prefer aligning to event top,
    // but slide up if the event is in the bottom half of the screen
    const maxTop = Math.max(8, window.innerHeight * 0.35)
    setDraftPopoverPos({
      top: Math.min(Math.max(8, rect.top), maxTop),
      left,
    })
    setDragOffset(null)
  }, [])

  // Click outside to dismiss draft popover
  useEffect(() => {
    if (!draft) return
    function handleClick(e: MouseEvent) {
      const popover = draftPopoverRef.current
      // If clicking inside popover, ignore
      if (popover && popover.contains(e.target as Node)) return
      // If clicking the draft event itself (drag/resize), ignore
      const draftEl = document.querySelector(`[data-event-id="${DRAFT_ID}"]`)
      if (draftEl && draftEl.contains(e.target as Node)) return
      // Dismiss draft
      clearDraft()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") clearDraft()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [draft, clearDraft])

  // Focus title input when draft popover appears
  useEffect(() => {
    if (draft && draftPopoverPos) {
      setTimeout(() => draftTitleRef.current?.focus(), 50)
    }
  }, [draft, draftPopoverPos])

  // Autoscuola search debounce — only search when no record is selected (free text mode)
  useEffect(() => {
    if (autoscuolaSearchTimeout.current) clearTimeout(autoscuolaSearchTimeout.current)
    if (draftAutoscuola || draftAutoscuolaText.length < 2) {
      setAutoscuolaResults([])
      setShowAutoscuolaDropdown(false)
      return
    }
    autoscuolaSearchTimeout.current = setTimeout(async () => {
      const results = await searchAutoscuole(draftAutoscuolaText)
      setAutoscuolaResults(results)
      setShowAutoscuolaDropdown(results.length > 0)
    }, 300)
    return () => {
      if (autoscuolaSearchTimeout.current) clearTimeout(autoscuolaSearchTimeout.current)
    }
  }, [draftAutoscuolaText, draftAutoscuola])

  // Close autoscuola dropdown on outside click
  useEffect(() => {
    if (!showAutoscuolaDropdown) return
    function handleClick(e: MouseEvent) {
      if (autoscuolaDropdownRef.current && !autoscuolaDropdownRef.current.contains(e.target as Node)) {
        setShowAutoscuolaDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showAutoscuolaDropdown])

  // Compute auto-generated title for non-custom presets
  const computedTitle = (() => {
    if (draftPreset === "custom") return null
    const preset = EVENT_PRESETS.find((p) => p.id === draftPreset)!
    return preset.titleTemplate.replace("{autoscuola}", draftAutoscuolaText.trim())
  })()

  // Helper: apply preset to draft
  const applyPreset = useCallback((presetId: EventPresetId, currentDraft: DraftEvent | null) => {
    const preset = EVENT_PRESETS.find((p) => p.id === presetId)!
    setDraftPreset(presetId)
    setDraftMeetLink(preset.meet)

    // Update duration — don't reposition popover (preserve user's drag)
    if (currentDraft) {
      const newEnd = new Date(new Date(currentDraft.start).getTime() + preset.duration * 60 * 1000).toISOString()
      setDraft({ ...currentDraft, end: newEnd })
    }
  }, [])

  // Handle autoscuola selection from dropdown
  const handleSelectAutoscuola = useCallback((result: AutoscuolaResult) => {
    setDraftAutoscuola(result)
    setDraftAutoscuolaText(result.name)
    setAutoscuolaResults([])
    setShowAutoscuolaDropdown(false)

    // Add email to guests if present and not already there
    if (result.email && !draftGuests.includes(result.email)) {
      setDraftGuests((prev) => [...prev, result.email!])
    }
  }, [draftGuests])

  // Handle free text change in autoscuola field — clears record selection
  const handleAutoscuolaTextChange = useCallback((text: string) => {
    // If user edits text after selecting a record, clear the selection
    if (draftAutoscuola && text !== draftAutoscuola.name) {
      // Remove the autoscuola's email from guests
      if (draftAutoscuola.email) {
        setDraftGuests((prev) => prev.filter((g) => g !== draftAutoscuola.email))
      }
      setDraftAutoscuola(null)
    }
    setDraftAutoscuolaText(text)
  }, [draftAutoscuola])

  const refreshEvents = useCallback(() => {
    const api = calRef.current?.getApi()
    if (api) {
      const view = api.view
      handleDatesSet({ start: view.activeStart, end: view.activeEnd } as DatesSetArg)
    }
  }, [])

  const handleDatesSet = useCallback(async (arg: DatesSetArg) => {
    const fetched = await getCalendarEvents(
      arg.start.toISOString(),
      arg.end.toISOString()
    )
    setEvents(fetched)
  }, [])

  const DETAIL_W = 340
  const handleEventClick = useCallback((info: EventClickArg) => {
    // Ignore clicks on draft event
    if (info.event.id === DRAFT_ID) return

    // Close any draft
    clearDraft()

    const rect = info.el.getBoundingClientRect()
    const event = events.find((e) => e.id === info.event.id)
    if (event) {
      // Smart left/right positioning
      const spaceRight = window.innerWidth - rect.right - POPOVER_GAP
      const spaceLeft = rect.left - POPOVER_GAP
      let left: number
      if (spaceRight >= DETAIL_W) {
        left = rect.right + POPOVER_GAP
      } else if (spaceLeft >= DETAIL_W) {
        left = rect.left - DETAIL_W - POPOVER_GAP
      } else {
        left = Math.max(8, (window.innerWidth - DETAIL_W) / 2)
      }

      setSelectedEvent(event)
      setPopoverPos({ top: rect.top, left })
      setDetailDragOffset(null)
      setDetailEditMode(false)
      setEditTitle(event.title)
      setEditStart(event.start)
      setEditEnd(event.end)
      setEditGuests(event.attendees.map((a) => a.email))
      setEditGuestInput("")
      setEditDescription(event.description ?? "")
    }
  }, [events, clearDraft])

  const closePopover = useCallback(() => {
    setSelectedEvent(null)
    setPopoverPos(null)
    setDetailDragOffset(null)
    setDetailEditMode(false)
  }, [])

  // Click outside to dismiss detail popover
  useEffect(() => {
    if (!selectedEvent) return
    function handleClick(e: MouseEvent) {
      const popover = detailPopoverRef.current
      if (popover && popover.contains(e.target as Node)) return
      // In edit mode, also ignore clicks on the event block itself (drag/resize handles)
      if (detailEditMode && selectedEvent) {
        const eventEl = document.querySelector(`[data-event-id="${selectedEvent.id}"]`)
        if (eventEl && eventEl.contains(e.target as Node)) return
        // Also ignore FullCalendar's resize/drag mirror elements
        const target = e.target as HTMLElement
        if (target.closest(".fc-event-dragging") || target.closest(".fc-event-resizing") || target.closest(".fc-event-mirror")) return
      }
      closePopover()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePopover()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedEvent, detailEditMode, closePopover])

  // Click or drag on a slot -> create draft (only when no draft is open)
  const handleSelect = useCallback((info: DateSelectArg) => {
    const api = calRef.current?.getApi()
    api?.unselect()

    // Close any existing event popover
    setSelectedEvent(null)
    setPopoverPos(null)

    const start = info.start
    let end = info.end

    // If click (not drag) in timeGrid, default to 1 hour
    const diffMs = end.getTime() - start.getTime()
    if (diffMs <= 15 * 60 * 1000 && !info.allDay) {
      end = new Date(start.getTime() + 60 * 60 * 1000)
    }

    setDraft({
      start: start.toISOString(),
      end: end.toISOString(),
      title: "(Senza titolo)",
    })
    setDraftTitle("")
    setDraftPreset("custom")
    setDraftAutoscuolaText("")
    setDraftAutoscuola(null)

    // Wait for draft event to render, then position popover
    setTimeout(updateDraftPopoverPos, 80)
  }, [updateDraftPopoverPos])

  // Draft event drag/resize -> update draft times
  const handleEventChange = useCallback((info: EventChangeArg) => {
    if (info.event.id === DRAFT_ID) {
      setDraft((prev) => prev ? {
        ...prev,
        start: info.event.start!.toISOString(),
        end: info.event.end!.toISOString(),
      } : null)
      setTimeout(updateDraftPopoverPos, 30)
    } else if (detailEditMode && info.event.id === selectedEvent?.id) {
      // Update edit state when dragging/resizing existing event in edit mode
      setEditStart(info.event.start!.toISOString())
      setEditEnd(info.event.end!.toISOString())
    }
  }, [updateDraftPopoverPos, detailEditMode, selectedEvent?.id])

  // Create event from draft popover
  const handleDraftSubmit = useCallback(() => {
    if (!draft) return
    // For non-custom presets, use the auto-generated title; for custom, use the manual title
    const title = draftPreset !== "custom"
      ? (computedTitle?.trim() || "Nuovo evento")
      : (draftTitle.trim() || "Nuovo evento")

    startTransition(async () => {
      try {
        await createCalendarEvent({
          title,
          description: draftNotes || undefined,
          startDateTime: new Date(draft.start).toISOString(),
          endDateTime: new Date(draft.end).toISOString(),
          guests: draftGuests,
          addMeetLink: draftMeetLink,
          autoscuolaId: draftAutoscuola?.id,
        })
        clearDraft()
        refreshEvents()
      } catch {
        // ignore
      }
    })
  }, [draft, draftPreset, computedTitle, draftTitle, draftNotes, draftGuests, draftMeetLink, draftAutoscuola, refreshEvents, clearDraft])

  // RSVP handler
  const handleRsvp = useCallback((eventId: string, status: "accepted" | "declined" | "tentative") => {
    startRsvpTransition(async () => {
      await rsvpCalendarEvent(eventId, status)
      refreshEvents()
    })
  }, [refreshEvents])

  // Build FullCalendar events including draft
  const fcEvents = [
    ...events.filter((e) => !e.allDay).map((e) => {
      const isBeingEdited = detailEditMode && selectedEvent?.id === e.id
      return {
        id: e.id,
        title: isBeingEdited ? editTitle : e.title,
        start: isBeingEdited ? editStart : e.start,
        end: isBeingEdited ? editEnd : e.end,
        allDay: e.allDay,
        backgroundColor: isBeingEdited ? "#EC489925" : (e.meetLink ? "#EC4899" : "#8B5CF6"),
        borderColor: isBeingEdited ? "#EC4899" : "transparent",
        textColor: isBeingEdited ? "#EC4899" : "#FFFFFF",
        editable: isBeingEdited,
        durationEditable: isBeingEdited,
        startEditable: isBeingEdited,
        classNames: isBeingEdited ? ["reglo-draft-event"] : [],
      }
    }),
    // Draft event
    ...(draft ? [{
      id: DRAFT_ID,
      title: (draftPreset !== "custom" ? computedTitle : draftTitle) || "(Senza titolo)",
      start: draft.start,
      end: draft.end,
      allDay: false,
      backgroundColor: "#EC489925",
      borderColor: "#EC4899",
      textColor: "#EC4899",
      editable: true,
      durationEditable: true,
      startEditable: true,
      classNames: ["reglo-draft-event"],
    }] : []),
  ]

  // Determine RSVP state for current user on selected event
  const selfAttendee = selectedEvent?.attendees.find((a) => a.self)
  const isOrganizer = selectedEvent ? !selfAttendee || (selfAttendee.self && selectedEvent.attendees.length <= 1) : false
  const showRsvp = selectedEvent && selfAttendee && !isOrganizer && !detailEditMode

  return (
    <div className="flex h-[calc(100vh)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-1 px-7 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pink/10">
            <Calendar className="h-5 w-5 text-pink" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.4px] text-ink-900">
              Calendario
            </h1>
            <p className="text-[12.5px] text-ink-400">I tuoi appuntamenti e meeting</p>
          </div>
        </div>
        <button
          onClick={() => {
            clearDraft()
            setSelectedEvent(null)
            setPopoverPos(null)
            // Create draft at next rounded 15-min slot
            const now = new Date()
            now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
            const end = new Date(now.getTime() + 60 * 60 * 1000)
            // Scroll to the time
            const api = calRef.current?.getApi()
            api?.scrollToTime({ hours: now.getHours(), minutes: now.getMinutes() })
            setDraft({
              start: now.toISOString(),
              end: end.toISOString(),
              title: "(Senza titolo)",
            })
            setDraftTitle("")
            setTimeout(updateDraftPopoverPos, 120)
          }}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[999px] bg-pink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-pink/90"
        >
          <Plus className="h-4 w-4" />
          Nuovo evento
        </button>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden bg-white">
        <style>{`
          /* ── Base ──────────────────────────────────── */
          .fc {
            --fc-border-color: #E2E8F0;
            --fc-today-bg-color: transparent;
            --fc-page-bg-color: white;
            --fc-neutral-bg-color: white;
            --fc-list-event-hover-bg-color: #FDF2F8;
            font-family: inherit;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* ── Toolbar ──────────────────────────────── */
          .fc .fc-toolbar {
            margin: 0 !important;
            padding: 12px 28px !important;
            border-bottom: 1px solid #F1F5F9;
            background: white;
            flex-shrink: 0;
          }
          .fc .fc-toolbar-title {
            font-size: 15px !important;
            font-weight: 700 !important;
            color: #0F172A;
            letter-spacing: -0.3px;
          }

          /* ── Buttons ──────────────────────────────── */
          .fc .fc-button {
            font-size: 12px !important;
            font-weight: 600 !important;
            border-radius: 999px !important;
            padding: 5px 14px !important;
            text-transform: capitalize !important;
            transition: all 150ms ease !important;
            box-shadow: none !important;
          }
          .fc .fc-button:focus {
            box-shadow: 0 0 0 2px #EC489930 !important;
          }
          .fc .fc-button-primary {
            background-color: #FFFFFF !important;
            border: 1px solid #E2E8F0 !important;
            color: #334155 !important;
          }
          .fc .fc-button-primary:hover {
            background-color: #F8FAFC !important;
            border-color: #CBD5E1 !important;
          }
          .fc .fc-button-primary:disabled {
            opacity: 0.5 !important;
          }
          .fc .fc-button-primary.fc-button-active,
          .fc .fc-button-primary:active {
            background-color: #FDF2F8 !important;
            border-color: #EC4899 !important;
            color: #EC4899 !important;
          }
          .fc .fc-prev-button,
          .fc .fc-next-button {
            padding: 5px 8px !important;
          }

          /* ── Scrollgrid: make it fill remaining space ── */
          .fc .fc-view-harness {
            flex: 1 !important;
            overflow: hidden !important;
          }
          .fc .fc-scrollgrid {
            border: none !important;
          }
          .fc .fc-scrollgrid td,
          .fc .fc-scrollgrid th {
            border-color: #F1F5F9 !important;
          }
          .fc .fc-scroller {
            overflow: auto !important;
          }
          .fc .fc-scroller-liquid-absolute {
            position: absolute !important;
            inset: 0 !important;
          }

          /* ── Sticky column headers ─────────────────── */
          .fc .fc-col-header {
            position: sticky !important;
            top: 0 !important;
            z-index: 3 !important;
            background: white !important;
          }
          .fc .fc-col-header-cell {
            background-color: white !important;
            border-bottom: 1px solid #E2E8F0 !important;
            border-left: none !important;
            border-right: none !important;
          }
          .fc .fc-col-header-cell-cushion {
            font-size: 11px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            color: #94A3B8 !important;
            padding: 8px 0 !important;
            text-decoration: none !important;
          }

          /* ── Compact time slots (10px per 15min = 40px/hour) ── */
          .fc .fc-timegrid-slot {
            height: 10px !important;
            border-bottom: none !important;
          }
          .fc .fc-timegrid-slot-label {
            vertical-align: top !important;
          }
          .fc .fc-timegrid-slot-label-cushion {
            font-size: 10px !important;
            font-weight: 500 !important;
            color: #94A3B8 !important;
            padding: 2px 8px 0 0 !important;
          }
          /* Only show lines on :00 and :30 */
          .fc .fc-timegrid-slot-lane {
            border-color: transparent !important;
            cursor: crosshair;
          }
          .fc tr[data-time$=":00:00"] > .fc-timegrid-slot-lane {
            border-top: 1px solid #F1F5F9 !important;
          }
          .fc tr[data-time$=":30:00"] > .fc-timegrid-slot-lane {
            border-top: 1px dashed #F8FAFC !important;
          }
          /* Only show labels for :00 */
          .fc .fc-timegrid-slot-label-frame {
            text-align: right;
          }
          .fc tr[data-time$=":15:00"] .fc-timegrid-slot-label-cushion,
          .fc tr[data-time$=":30:00"] .fc-timegrid-slot-label-cushion,
          .fc tr[data-time$=":45:00"] .fc-timegrid-slot-label-cushion {
            visibility: hidden;
          }

          .fc .fc-timegrid-divider {
            display: none;
          }

          /* ── Today column ─────────────────────────── */
          .fc .fc-day-today {
            background-color: transparent !important;
          }
          .fc td, .fc th {
            background-color: transparent !important;
          }
          .fc .fc-timegrid-col.fc-day-today {
            background-color: transparent !important;
          }
          .fc .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion {
            color: #EC4899 !important;
          }

          /* ── Now indicator ────────────────────────── */
          .fc .fc-timegrid-col {
            overflow: visible !important;
          }
          .fc .fc-timegrid-now-indicator-line {
            border: none !important;
            height: 2px !important;
            background: linear-gradient(90deg, #EC4899 0%, #EC489960 70%, transparent 100%) !important;
            z-index: 4 !important;
            overflow: visible !important;
          }
          .fc .fc-timegrid-now-indicator-line::before {
            content: "";
            position: absolute;
            left: 0;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #EC4899;
            box-shadow: 0 0 0 3px #EC489925, 0 0 8px #EC489940;
          }
          .fc .fc-timegrid-now-indicator-arrow {
            display: none !important;
          }

          /* ── Events ───────────────────────────────── */
          .fc .fc-event {
            border-radius: 6px !important;
            border: none !important;
            border-left: 3px solid rgba(255,255,255,0.4) !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            padding: 1px 4px !important;
            cursor: pointer !important;
            transition: opacity 150ms ease !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.06) !important;
          }
          .fc .fc-event:hover {
            opacity: 0.9;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
          }
          .fc .fc-event .fc-event-time {
            font-size: 10px !important;
            font-weight: 600 !important;
            opacity: 0.8;
          }
          .fc .fc-event .fc-event-title {
            font-weight: 600 !important;
          }
          .fc .fc-timegrid-event-harness {
            margin-right: 2px !important;
          }

          /* ── Draft event ───────────────────────────── */
          .fc .reglo-draft-event {
            background-color: #FDF2F8 !important;
            border: 2px dashed #EC4899 !important;
            border-left: 2px dashed #EC4899 !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 12px #EC489920 !important;
            cursor: move !important;
          }
          .fc .reglo-draft-event .fc-event-time,
          .fc .reglo-draft-event .fc-event-title {
            color: #EC4899 !important;
            font-weight: 600 !important;
            font-size: 10px !important;
          }
          .fc .reglo-draft-event .fc-event-resizer {
            opacity: 1 !important;
          }
          .fc .reglo-draft-event .fc-event-resizer-end::after {
            content: "";
            position: absolute;
            left: 50%;
            bottom: 2px;
            transform: translateX(-50%);
            width: 20px;
            height: 3px;
            border-radius: 2px;
            background-color: #EC4899;
            opacity: 0.5;
          }

          /* ── Select highlight ──────────────────────── */
          .fc .fc-highlight {
            background-color: #EC489910 !important;
            border: none !important;
          }

          /* ── All-day events ───────────────────────── */
          .fc .fc-daygrid-event {
            border-radius: 4px !important;
            padding: 0 4px !important;
            font-size: 11px !important;
          }

          /* ── Day grid (month view) ────────────────── */
          .fc .fc-daygrid-day-number {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #334155 !important;
            padding: 6px 8px !important;
            text-decoration: none !important;
          }
          .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
            color: #EC4899 !important;
          }
          .fc .fc-daygrid-day-frame {
            min-height: 80px !important;
            cursor: crosshair;
          }

          /* ── Axis & column borders ─────────────────── */
          .fc .fc-timegrid-axis {
            border-color: #F1F5F9 !important;
            width: 52px !important;
          }
          .fc .fc-timegrid-col {
            border-color: #F1F5F9 !important;
          }
          .fc .fc-timegrid-axis-cushion {
            font-size: 10px !important;
            color: #94A3B8 !important;
            font-weight: 500 !important;
          }
        `}</style>
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,dayGridMonth",
          }}
          locale="it"
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          allDaySlot={false}
          height="100%"
          stickyHeaderDates={true}
          events={fcEvents}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          datesSet={handleDatesSet}
          selectable={!draft}
          selectMirror={true}
          select={handleSelect}
          nowIndicator={true}
          expandRows={true}
          dayHeaderFormat={{ weekday: "short", day: "2-digit", month: "2-digit" }}
          eventDataTransform={(data) => {
            // Tag events with data-event-id so we can find the draft in DOM
            return { ...data, extendedProps: { ...data.extendedProps, dataEventId: data.id } }
          }}
          eventDidMount={(info) => {
            info.el.setAttribute("data-event-id", info.event.id)
          }}
          buttonText={{
            today: "Oggi",
            week: "Settimana",
            month: "Mese",
          }}
        />
      </div>

      {/* Event detail popover */}
      {selectedEvent && popoverPos && (
        <div
          ref={detailPopoverRef}
          className={`fixed z-50 rounded-[20px] border border-border-1 bg-surface shadow-xl ${detailEditMode ? "w-[400px]" : "w-[340px]"}`}
          style={{
            top: Math.max(8, Math.min(
              (detailDragOffset?.y ?? 0) + popoverPos.top,
              window.innerHeight - (detailEditMode ? 540 : 400)
            )),
            left: Math.max(8, Math.min(
              (detailDragOffset?.x ?? 0) + popoverPos.left,
              window.innerWidth - (detailEditMode ? 420 : 360)
            )),
          }}
        >
          {/* Drag handle */}
          <div
            className="flex cursor-grab items-center justify-center rounded-t-[20px] py-2 active:cursor-grabbing"
            onMouseDown={(e) => {
              e.preventDefault()
              isDraggingDetail.current = true
              const startX = e.clientX
              const startY = e.clientY
              const startOX = detailDragOffset?.x ?? 0
              const startOY = detailDragOffset?.y ?? 0
              function onMove(ev: MouseEvent) {
                if (!isDraggingDetail.current) return
                setDetailDragOffset({
                  x: startOX + (ev.clientX - startX),
                  y: startOY + (ev.clientY - startY),
                })
              }
              function onUp() {
                isDraggingDetail.current = false
                document.removeEventListener("mousemove", onMove)
                document.removeEventListener("mouseup", onUp)
              }
              document.addEventListener("mousemove", onMove)
              document.addEventListener("mouseup", onUp)
            }}
          >
            <div className="h-1 w-8 rounded-full bg-ink-300/50" />
          </div>

          <div className="px-5 pt-3 pb-5">
            {/* Header: title + action icons (pencil, trash, X) */}
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="flex-1 text-[15px] font-bold leading-snug text-ink-900">
                {detailEditMode ? "Modifica evento" : selectedEvent.title}
              </h3>
              <div className="flex shrink-0 gap-0.5">
                <button
                  onClick={() => {
                    setEditTitle(selectedEvent.title)
                    setEditStart(selectedEvent.start)
                    setEditEnd(selectedEvent.end)
                    setEditGuests(selectedEvent.attendees.map((a) => a.email))
                    setEditGuestInput("")
                    setEditDescription(selectedEvent.description ?? "")
                    setDetailEditMode(true)
                  }}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${detailEditMode ? "bg-pink/10 text-pink" : "text-ink-400 hover:bg-surface-2 hover:text-ink-600"}`}
                  title="Modifica"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (!confirm("Eliminare questo evento?")) return
                    deleteCalendarEvent(selectedEvent.id).then(() => {
                      closePopover()
                      refreshEvents()
                    })
                  }}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Elimina"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={closePopover}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {detailEditMode ? (
              /* ── Edit mode ── */
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Titolo</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DateTimePicker
                    label="Inizio"
                    value={toLocalISOString(new Date(editStart))}
                    onChange={(v) => {
                      const newStart = new Date(v.replace("T", " "))
                      const duration = new Date(editEnd).getTime() - new Date(editStart).getTime()
                      setEditStart(newStart.toISOString())
                      setEditEnd(new Date(newStart.getTime() + duration).toISOString())
                    }}
                  />
                  <DateTimePicker
                    label="Fine"
                    value={toLocalISOString(new Date(editEnd))}
                    onChange={(v) => setEditEnd(new Date(v.replace("T", " ")).toISOString())}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Ospiti</label>
                  <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-border-1 bg-surface p-2">
                    {editGuests.map((g) => (
                      <span key={g} className="flex items-center gap-1 rounded-[6px] bg-surface-2 px-2 py-1 text-[12px] text-ink-700">
                        {g}
                        <button onClick={() => setEditGuests(editGuests.filter((x) => x !== g))} className="cursor-pointer text-ink-400 hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      value={editGuestInput}
                      onChange={(e) => setEditGuestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault()
                          const email = editGuestInput.trim()
                          if (email && email.includes("@") && !editGuests.includes(email)) {
                            setEditGuests([...editGuests, email])
                            setEditGuestInput("")
                          }
                        }
                      }}
                      onBlur={() => {
                        const email = editGuestInput.trim()
                        if (email && email.includes("@") && !editGuests.includes(email)) {
                          setEditGuests([...editGuests, email])
                          setEditGuestInput("")
                        }
                      }}
                      placeholder={editGuests.length === 0 ? "email@esempio.com" : ""}
                      className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[12.5px] text-ink-900 outline-none placeholder:text-ink-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Note</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Aggiungi dettagli…"
                    rows={3}
                    className="w-full resize-none rounded-[10px] border border-border-1 bg-surface p-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setDetailEditMode(false)}
                    className="h-9 cursor-pointer rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 transition-colors hover:bg-surface-2"
                  >
                    Annulla
                  </button>
                  <button
                    disabled={isSavingEdit}
                    onClick={() => {
                      startSavingEdit(async () => {
                        await updateCalendarEvent(selectedEvent.id, {
                          title: editTitle.trim(),
                          description: editDescription,
                          startDateTime: new Date(editStart).toISOString(),
                          endDateTime: new Date(editEnd).toISOString(),
                          guests: editGuests,
                        })
                        setDetailEditMode(false)
                        closePopover()
                        refreshEvents()
                      })
                    }}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-50"
                  >
                    {isSavingEdit ? "Salvataggio..." : "Salva modifiche"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <>
                <div className="mb-4 flex items-center gap-2 text-[12.5px] text-ink-500">
                  <Clock className="h-3.5 w-3.5 text-ink-400" />
                  {formatEventTime(selectedEvent.start, selectedEvent.end, selectedEvent.allDay)}
                </div>

                {selectedEvent.attendees.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      <Users className="h-3 w-3" />
                      Partecipanti
                    </div>
                    <div className="space-y-1.5">
                      {selectedEvent.attendees.map((a) => (
                        <div key={a.email} className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-[9px] font-bold text-ink-500">
                            {(a.name ?? a.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[12.5px] text-ink-600">{a.name ?? a.email}</span>
                          {a.status === "accepted" && <span className="text-[10px] text-green">&#10003;</span>}
                          {a.status === "declined" && <span className="text-[10px] text-red-500">&#10007;</span>}
                          {a.status === "tentative" && <span className="text-[10px] text-amber-500">?</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.autoscuola && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      <Building className="h-3 w-3" />
                      Autoscuola
                    </div>
                    <Link
                      href={`/autoscuola/${selectedEvent.autoscuola.id}`}
                      className="flex items-center gap-2 rounded-[8px] bg-surface-2 px-3 py-2 text-[13px] font-medium text-pink transition-colors hover:bg-pink/10"
                    >
                      <Building className="h-3.5 w-3.5" />
                      {selectedEvent.autoscuola.name}
                    </Link>
                  </div>
                )}

                {selectedEvent.description && (
                  <p className="mb-4 rounded-[8px] bg-surface-2 p-2.5 text-[12px] leading-relaxed text-ink-600">
                    {selectedEvent.description.slice(0, 200)}
                  </p>
                )}

                {/* RSVP buttons */}
                {showRsvp && (
                  <div className="mb-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      Parteciperai?
                    </div>
                    <div className="flex gap-1.5">
                      {([
                        { status: "accepted" as const, label: "Si", activeColor: "bg-green/15 text-green border-green/30", activeBorder: "border-green/30" },
                        { status: "declined" as const, label: "No", activeColor: "bg-red-50 text-red-500 border-red-200", activeBorder: "border-red-200" },
                        { status: "tentative" as const, label: "Forse", activeColor: "bg-amber-50 text-amber-600 border-amber-200", activeBorder: "border-amber-200" },
                      ] as const).map((opt) => {
                        const isActive = selfAttendee?.status === opt.status
                        return (
                          <button
                            key={opt.status}
                            disabled={isRsvpPending}
                            onClick={() => handleRsvp(selectedEvent.id, opt.status)}
                            className={`h-8 cursor-pointer rounded-[999px] border px-4 text-[12px] font-semibold transition-all disabled:opacity-50 ${
                              isActive
                                ? opt.activeColor
                                : "border-border-1 text-ink-500 hover:bg-surface-2"
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {selectedEvent.meetLink && (
                    <a href={selectedEvent.meetLink} target="_blank" rel="noopener noreferrer"
                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[999px] bg-pink px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-pink/90">
                      <Video className="h-3.5 w-3.5" /> Partecipa
                    </a>
                  )}
                  {selectedEvent.htmlLink && (
                    <a href={selectedEvent.htmlLink} target="_blank" rel="noopener noreferrer"
                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[999px] border border-border-1 px-3.5 text-[12px] font-medium text-ink-600 transition-colors hover:bg-surface-2">
                      <ExternalLink className="h-3.5 w-3.5" /> Apri
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Draft popover — no mask, floating next to draft block */}
      {draft && draftPopoverPos && (() => {
        const popoverTop = Math.max(8, (dragOffset?.y ?? 0) + draftPopoverPos.top)
        return (
        <div
          ref={draftPopoverRef}
          className="fixed z-50 w-[400px] rounded-[20px] border border-border-1 bg-surface shadow-xl"
          style={{
            top: popoverTop,
            left: Math.max(8, Math.min(
              (dragOffset?.x ?? 0) + draftPopoverPos.left,
              window.innerWidth - 420
            )),
          }}
        >
          {/* Drag handle bar */}
          <div
            className="flex cursor-grab items-center justify-center rounded-t-[20px] py-2 active:cursor-grabbing"
            onMouseDown={(e) => {
              e.preventDefault()
              isDraggingPopover.current = true
              const startX = e.clientX
              const startY = e.clientY
              const startOffsetX = dragOffset?.x ?? 0
              const startOffsetY = dragOffset?.y ?? 0

              function onMove(ev: MouseEvent) {
                if (!isDraggingPopover.current) return
                setDragOffset({
                  x: startOffsetX + (ev.clientX - startX),
                  y: startOffsetY + (ev.clientY - startY),
                })
              }
              function onUp() {
                isDraggingPopover.current = false
                document.removeEventListener("mousemove", onMove)
                document.removeEventListener("mouseup", onUp)
              }
              document.addEventListener("mousemove", onMove)
              document.addEventListener("mouseup", onUp)
            }}
          >
            <div className="h-1 w-8 rounded-full bg-ink-300/50" />
          </div>

          <div className="px-6 pb-6">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-ink-900">Nuovo meeting</h2>
              <button
                onClick={clearDraft}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

          <div className="flex flex-col gap-4">
            {/* Preset pills */}
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Tipo evento</label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id, draft)}
                    className={`h-7 cursor-pointer rounded-[999px] border px-3 text-[11.5px] font-semibold transition-all ${
                      draftPreset === preset.id
                        ? "border-pink bg-pink/10 text-pink"
                        : "border-border-1 text-ink-500 hover:bg-surface-2"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Autoscuola combobox */}
            <div ref={autoscuolaDropdownRef} className="relative">
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Autoscuola</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  value={draftAutoscuolaText}
                  onChange={(e) => handleAutoscuolaTextChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !showAutoscuolaDropdown) handleDraftSubmit() }}
                  placeholder="Nome autoscuola (facoltativo)"
                  className={`h-[38px] w-full rounded-[10px] border bg-surface pl-9 pr-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20 ${
                    draftAutoscuola ? "border-pink/40" : "border-border-1"
                  }`}
                />
                {draftAutoscuola && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[4px] bg-pink/10 px-1.5 py-0.5 text-[10px] font-semibold text-pink">
                    Collegata
                  </span>
                )}
              </div>
              {showAutoscuolaDropdown && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[200px] overflow-y-auto rounded-[12px] border border-border-1 bg-surface shadow-lg">
                  {autoscuolaResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelectAutoscuola(r)}
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

            {/* Title — only shown for "custom" preset */}
            {draftPreset === "custom" && (
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Titolo</label>
                <input
                  ref={draftTitleRef}
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleDraftSubmit() }}
                  placeholder="Meeting con…"
                  className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
                />
              </div>
            )}

            {/* Date/time */}
            <div className="grid grid-cols-2 gap-3">
              <DateTimePicker
                label="Inizio"
                value={toLocalISOString(new Date(draft.start))}
                onChange={(v) => {
                  const newStart = new Date(v.replace("T", " "))
                  const oldDuration = new Date(draft.end).getTime() - new Date(draft.start).getTime()
                  setDraft({
                    ...draft,
                    start: newStart.toISOString(),
                    end: new Date(newStart.getTime() + oldDuration).toISOString(),
                  })
                }}
              />
              <DateTimePicker
                label="Fine"
                value={toLocalISOString(new Date(draft.end))}
                onChange={(v) => {
                  setDraft({ ...draft, end: new Date(v.replace("T", " ")).toISOString() })
                }}
              />
            </div>

            {/* Guests */}
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Ospiti</label>
              <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-border-1 bg-surface p-2">
                {draftGuests.map((g) => (
                  <span key={g} className="flex items-center gap-1 rounded-[6px] bg-surface-2 px-2 py-1 text-[12px] text-ink-700">
                    {g}
                    <button onClick={() => setDraftGuests(draftGuests.filter((x) => x !== g))} className="cursor-pointer text-ink-400 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={draftGuestInput}
                  onChange={(e) => setDraftGuestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      const email = draftGuestInput.trim()
                      if (email && email.includes("@") && !draftGuests.includes(email)) {
                        setDraftGuests([...draftGuests, email])
                        setDraftGuestInput("")
                      }
                    }
                  }}
                  onBlur={() => {
                    const email = draftGuestInput.trim()
                    if (email && email.includes("@") && !draftGuests.includes(email)) {
                      setDraftGuests([...draftGuests, email])
                      setDraftGuestInput("")
                    }
                  }}
                  placeholder={draftGuests.length === 0 ? "email@esempio.com" : ""}
                  className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[12.5px] text-ink-900 outline-none placeholder:text-ink-400"
                />
              </div>
            </div>

            {/* Meet link toggle */}
            <label className="flex cursor-pointer items-center gap-3">
              <div
                onClick={() => setDraftMeetLink(!draftMeetLink)}
                className="flex h-5 w-9 items-center rounded-full p-0.5 transition-colors"
                style={{ backgroundColor: draftMeetLink ? "#EC4899" : "#CBD5E1" }}
              >
                <div
                  className="h-4 w-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: draftMeetLink ? "translateX(16px)" : "translateX(0)" }}
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
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="Aggiungi dettagli…"
                rows={3}
                className="w-full resize-none rounded-[10px] border border-border-1 bg-surface p-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={clearDraft}
                className="h-9 cursor-pointer rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 transition-colors hover:bg-surface-2"
              >
                Annulla
              </button>
              <button
                onClick={handleDraftSubmit}
                disabled={isPending}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-50"
              >
                {isPending ? "Creazione..." : "Crea evento"}
              </button>
            </div>
          </div>
          </div>
        </div>
        )
      })()}

    </div>
  )
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatEventTime(start: string, end: string, allDay: boolean) {
  if (allDay) {
    return new Date(start).toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }
  const s = new Date(start)
  const e = new Date(end)
  const dateStr = s.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
  const startTime = s.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  const endTime = e.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  return `${dateStr} · ${startTime} – ${endTime}`
}
