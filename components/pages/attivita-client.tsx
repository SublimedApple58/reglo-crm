"use client"

import { useState, useTransition, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { CheckCircle2, Circle, ListChecks, Calendar, Plus, X } from "lucide-react"
import { completeGoogleTask, uncompleteGoogleTask, createGoogleTask } from "@/lib/actions/calendar"
import type { GoogleTask } from "@/lib/actions/calendar"
import { DateTimePicker } from "@/components/date-time-picker"

type Filter = "all" | "todo" | "done"

function getTaskDueBadge(due: string | null) {
  if (!due) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dueDate = new Date(due)
  dueDate.setHours(0, 0, 0, 0)

  if (dueDate < today) return { label: "Scaduta", className: "bg-red-100 text-red-700" }
  if (dueDate.getTime() === today.getTime()) return { label: "Oggi", className: "bg-amber-100 text-amber-700" }
  if (dueDate.getTime() === tomorrow.getTime()) return { label: "Domani", className: "bg-blue-100 text-blue-700" }
  return {
    label: dueDate.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
    className: "bg-ink-100 text-ink-500",
  }
}

function parseFollowUpLink(task: GoogleTask): { name: string; href: string } | null {
  const titleMatch = task.title.match(/^Follow-up con (.+?)(?:\s*\(\d{2}:\d{2}\))?$/)
  if (!titleMatch) return null
  const linkMatch = task.notes?.match(/\/autoscuola\/([^\s]+)/)
  if (!linkMatch) return { name: titleMatch[1], href: "#" }
  return { name: titleMatch[1], href: `/autoscuola/${linkMatch[1]}` }
}

function getGroupKey(due: string | null): string {
  if (!due) return "no_date"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(due)
  dueDate.setHours(0, 0, 0, 0)

  const diff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return "overdue"
  if (diff === 0) return "today"
  if (diff === 1) return "tomorrow"
  if (diff <= 7) return "this_week"
  return "later"
}

const GROUP_LABELS: Record<string, string> = {
  overdue: "Scadute",
  today: "Oggi",
  tomorrow: "Domani",
  this_week: "Questa settimana",
  later: "Più avanti",
  no_date: "Senza data",
}

const GROUP_ORDER = ["overdue", "today", "tomorrow", "this_week", "later", "no_date"]

export function AttivitaClient({
  tasks: initialTasks,
  googleConnected,
}: {
  tasks: GoogleTask[]
  googleConnected: boolean
}) {
  const [filter, setFilter] = useState<Filter>("todo")
  const [toggledIds, setToggledIds] = useState<Map<string, "completed" | "needsAction">>(new Map())
  const [isPending, startTransition] = useTransition()
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const todayStr = new Date().toISOString().slice(0, 10)
  const [newDue, setNewDue] = useState(todayStr)
  const titleRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const tasks = useMemo(() => {
    return initialTasks.map((t) => {
      const toggled = toggledIds.get(t.id)
      if (toggled) return { ...t, status: toggled }
      return t
    }) as GoogleTask[]
  }, [initialTasks, toggledIds])

  const pendingCount = tasks.filter((t) => t.status === "needsAction").length

  const filtered = useMemo(() => {
    if (filter === "todo") return tasks.filter((t) => t.status === "needsAction")
    if (filter === "done") return tasks.filter((t) => t.status === "completed")
    return tasks
  }, [tasks, filter])

  const grouped = useMemo(() => {
    const groups: Record<string, GoogleTask[]> = {}
    for (const task of filtered) {
      const key = task.status === "completed" ? "completed" : getGroupKey(task.due)
      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    }
    const order = filter === "done" ? ["completed"] : filter === "all" ? [...GROUP_ORDER, "completed"] : GROUP_ORDER
    return order
      .filter((key) => groups[key]?.length)
      .map((key) => ({
        key,
        label: key === "completed" ? "Completate" : GROUP_LABELS[key],
        tasks: groups[key],
      }))
  }, [filtered, filter])

  function handleCreate() {
    if (!newTitle.trim()) return
    const dueDate = new Date(newDue + "T09:00:00").toISOString()

    startTransition(async () => {
      await createGoogleTask({ title: newTitle.trim(), dueDate })
      setNewTitle("")
      setNewDue(todayStr)
      setShowNewForm(false)
      router.refresh()
    })
  }

  function handleToggle(task: GoogleTask) {
    const newStatus = task.status === "needsAction" ? "completed" : "needsAction"
    setToggledIds((prev) => new Map(prev).set(task.id, newStatus as "completed" | "needsAction"))

    startTransition(async () => {
      try {
        if (newStatus === "completed") {
          await completeGoogleTask(task.id)
        } else {
          await uncompleteGoogleTask(task.id)
        }
      } catch {
        setToggledIds((prev) => {
          const next = new Map(prev)
          next.delete(task.id)
          return next
        })
      }
    })
  }

  if (!googleConnected) {
    return (
      <div className="mx-auto flex max-w-[600px] flex-col items-center justify-center px-6 py-24 text-center">
        <Calendar className="mb-4 h-12 w-12 text-ink-300" />
        <h2 className="mb-2 text-[18px] font-bold text-ink-900">Collega Google Calendar</h2>
        <p className="mb-6 text-[14px] text-ink-500">
          Per visualizzare le tue attività e follow-up, collega il tuo account Google.
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/attivita" })}
          className="flex h-[38px] items-center gap-2 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90"
        >
          Collega Google
        </button>
      </div>
    )
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Tutte" },
    { key: "todo", label: "Da fare" },
    { key: "done", label: "Completate" },
  ]

  return (
    <div className="mx-auto max-w-[820px] px-9 pt-7 pb-[60px]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-pink/10">
          <ListChecks className="h-[18px] w-[18px] text-pink" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.4px] text-ink-900">
            Le mie attività
          </h1>
        </div>
        {pendingCount > 0 && (
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-pink/10 px-2 font-mono text-[11px] font-semibold text-pink">
            {pendingCount}
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => {
              setShowNewForm((v) => !v)
              setTimeout(() => titleRef.current?.focus(), 50)
            }}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-pink text-white transition-colors hover:bg-pink/90"
          >
            {showNewForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* New task form */}
      {showNewForm && (
        <div className="mb-5 rounded-[12px] border border-ink-100 bg-white p-4">
          <div className="flex gap-3">
            <input
              ref={titleRef}
              type="text"
              placeholder="Titolo attività..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="h-9 flex-1 rounded-[8px] border border-ink-200 px-3 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-pink focus:outline-none"
            />
            <div className="shrink-0">
              <DateTimePicker
                value={newDue + "T09:00"}
                onChange={(v) => setNewDue(v.slice(0, 10))}
                dateOnly
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || isPending}
              className="h-9 rounded-[8px] bg-pink px-4 text-[13px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-50"
            >
              Crea
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex gap-1 rounded-[10px] bg-surface-2 p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex-1 rounded-[8px] py-1.5 text-[12.5px] font-semibold transition-colors"
            style={{
              backgroundColor: filter === f.key ? "white" : "transparent",
              color: filter === f.key ? "#1E293B" : "#94A3B8",
              boxShadow: filter === f.key ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task groups */}
      {grouped.length > 0 ? (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.key}>
              <h3 className="mb-2 text-[11px] font-semibold tracking-[0.5px] text-ink-400 uppercase">
                {group.label}
              </h3>
              <div className="space-y-0.5">
                {group.tasks.map((task) => {
                  const badge = getTaskDueBadge(task.due)
                  const followUp = parseFollowUpLink(task)
                  const displayTitle = task.title.replace(/\s*\(\d{2}:\d{2}\)$/, "")
                  const isDone = task.status === "completed"

                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <button
                        onClick={() => handleToggle(task)}
                        disabled={isPending}
                        className={`mt-0.5 shrink-0 transition-colors ${isDone ? "text-pink" : "text-ink-300 hover:text-pink"}`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-[18px] w-[18px]" />
                        ) : (
                          <Circle className="h-[18px] w-[18px]" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        {followUp ? (
                          <p className={`text-[13.5px] font-semibold ${isDone ? "line-through text-ink-400" : "text-ink-900"}`}>
                            Follow-up con{" "}
                            <Link href={followUp.href} className="text-pink hover:underline">
                              {followUp.name}
                            </Link>
                          </p>
                        ) : (
                          <p className={`text-[13.5px] font-semibold ${isDone ? "line-through text-ink-400" : "text-ink-900"}`}>
                            {displayTitle}
                          </p>
                        )}
                        <div className="mt-0.5 flex items-center gap-2">
                          {badge && !isDone && (
                            <span className={`inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                          {task.notes && !task.notes.startsWith("Link:") && (
                            <span className="truncate text-[11.5px] text-ink-400">
                              {task.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-ink-300" />
          <p className="text-[14px] font-medium text-ink-500">
            {filter === "todo" ? "Nessuna attività in sospeso" : filter === "done" ? "Nessuna attività completata" : "Nessuna attività"}
          </p>
        </div>
      )}
    </div>
  )
}
