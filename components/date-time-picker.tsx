"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Clock, Calendar, Check } from "lucide-react"

const DAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]

type DateTimePickerProps = {
  value: string // local ISO string "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void
  label?: string
}

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function toLocalISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseLocal(s: string) {
  const [datePart, timePart] = s.split("T")
  const [y, m, d] = datePart.split("-").map(Number)
  const [h, min] = (timePart ?? "00:00").split(":").map(Number)
  return new Date(y, m - 1, d, h, min)
}

export function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Staging value — only committed on confirm
  const [staging, setStaging] = useState(value)
  const stagingDate = parseLocal(staging)

  const [viewMonth, setViewMonth] = useState(stagingDate.getMonth())
  const [viewYear, setViewYear] = useState(stagingDate.getFullYear())

  // Reset staging when picker opens
  useEffect(() => {
    if (open) {
      setStaging(value)
      const d = parseLocal(value)
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
    }
  }, [open, value])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const setStagingDate = useCallback((day: number, month: number, year: number) => {
    const d = parseLocal(staging)
    d.setFullYear(year, month, day)
    setStaging(toLocalISO(d))
  }, [staging])

  const setStagingTime = useCallback((hours: number, minutes: number) => {
    const d = parseLocal(staging)
    d.setHours(hours, minutes)
    setStaging(toLocalISO(d))
  }, [staging])

  const handleConfirm = useCallback(() => {
    onChange(staging)
    setOpen(false)
  }, [staging, onChange])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day: prevMonthDays - i, month: m, year: y, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false })
  }

  const today = new Date()
  const isToday = (day: number, month: number, year: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const isSelected = (day: number, month: number, year: number) =>
    day === stagingDate.getDate() && month === stagingDate.getMonth() && year === stagingDate.getFullYear()

  const hours = stagingDate.getHours()
  const minutes = stagingDate.getMinutes()

  // Display from committed value
  const displayDate = parseLocal(value)
  const displayDateStr = `${pad(displayDate.getDate())}/${pad(displayDate.getMonth() + 1)}/${displayDate.getFullYear()}`
  const displayTimeStr = `${pad(displayDate.getHours())}:${pad(displayDate.getMinutes())}`

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-[38px] w-full cursor-pointer items-center gap-2 rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none transition-colors hover:border-ink-300 focus:border-pink focus:ring-2 focus:ring-pink/20"
      >
        <Calendar className="h-3.5 w-3.5 text-ink-400" />
        <span>{displayDateStr}</span>
        <span className="text-ink-400">·</span>
        <Clock className="h-3.5 w-3.5 text-ink-400" />
        <span>{displayTimeStr}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-[280px] rounded-[14px] border border-border-1 bg-surface p-4 shadow-xl">
          {/* Month nav */}
          <div className="mb-3 flex items-center justify-between">
            <button onClick={prevMonth} type="button" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-600">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-semibold text-ink-900">
              {MONTHS_IT[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} type="button" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-600">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {DAYS_IT.map((d) => (
              <div key={d} className="py-1 text-center text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((cell, i) => {
              const selected = isSelected(cell.day, cell.month, cell.year)
              const todayCell = isToday(cell.day, cell.month, cell.year)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setStagingDate(cell.day, cell.month, cell.year)
                    setViewMonth(cell.month)
                    setViewYear(cell.year)
                  }}
                  className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-full text-[12.5px] font-medium transition-colors
                    ${!cell.isCurrentMonth ? "text-ink-300" : "text-ink-700 hover:bg-surface-2"}
                    ${selected ? "!bg-pink !text-white hover:!bg-pink/90" : ""}
                    ${todayCell && !selected ? "font-bold text-pink" : ""}
                  `}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-border-1" />

          {/* Time picker */}
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-ink-400" />
            <span className="text-[12px] font-medium text-ink-500">Orario</span>
            <div className="flex-1" />
            <select
              value={hours}
              onChange={(e) => setStagingTime(Number(e.target.value), minutes)}
              className="h-[32px] cursor-pointer rounded-[8px] border border-border-1 bg-surface px-2 text-center text-[13px] font-medium text-ink-900 outline-none focus:border-pink"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{pad(i)}</option>
              ))}
            </select>
            <span className="text-[13px] font-bold text-ink-400">:</span>
            <select
              value={minutes}
              onChange={(e) => setStagingTime(hours, Number(e.target.value))}
              className="h-[32px] cursor-pointer rounded-[8px] border border-border-1 bg-surface px-2 text-center text-[13px] font-medium text-ink-900 outline-none focus:border-pink"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{pad(m)}</option>
              ))}
            </select>
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[999px] bg-pink text-[12.5px] font-semibold text-white transition-colors hover:bg-pink/90"
          >
            <Check className="h-3.5 w-3.5" />
            Conferma
          </button>
        </div>
      )}
    </div>
  )
}
