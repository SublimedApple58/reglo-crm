"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { ArrowUpRight, Video, Calendar, ChevronRight, CheckCircle2, Circle, ListChecks } from "lucide-react"
import { completeGoogleTask } from "@/lib/actions/calendar"
import type { GoogleTask } from "@/lib/actions/calendar"
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Polygon,
} from "@vis.gl/react-google-maps"
import { REGIONI_PROVINCE } from "@/lib/constants"

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

function TasksWidget({ tasks }: { tasks: GoogleTask[] }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const pendingTasks = tasks.filter((t) => t.status === "needsAction" && !completed.has(t.id))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTasks = pendingTasks.filter((t) => {
    if (!t.due) return false
    const due = new Date(t.due)
    due.setHours(0, 0, 0, 0)
    return due.getTime() <= today.getTime()
  })
  const futureTasks = pendingTasks.filter((t) => {
    if (!t.due) return true
    const due = new Date(t.due)
    due.setHours(0, 0, 0, 0)
    return due.getTime() > today.getTime()
  })
  const maxTotal = 6
  const showToday = todayTasks.slice(0, maxTotal)
  const remaining = maxTotal - showToday.length
  const showFuture = remaining > 0 ? futureTasks.slice(0, remaining) : []

  function handleComplete(taskId: string) {
    setCompleted((prev) => new Set(prev).add(taskId))
    startTransition(async () => {
      try {
        await completeGoogleTask(taskId)
      } catch {
        setCompleted((prev) => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
      }
    })
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[18px] border border-border-1 bg-surface">
      <div className="flex items-center justify-between border-b border-border-1 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-pink" />
          <h4 className="text-[14px] font-bold text-ink-900">Le mie attività</h4>
          {pendingTasks.length > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink/10 px-1.5 font-mono text-[10px] font-semibold text-pink">
              {pendingTasks.length}
            </span>
          )}
        </div>
        <Link
          href="/attivita"
          className="flex items-center gap-1 text-[12px] font-medium text-pink hover:underline"
        >
          Vedi tutte
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex-1 px-5 py-3">
        {showToday.length > 0 || showFuture.length > 0 ? (
          <div className="space-y-2">
            {showToday.length > 0 && (
              <>
                <p className="text-[10.5px] font-semibold tracking-[0.3px] text-ink-400 uppercase">Oggi</p>
                {showToday.map((task) => (
                  <TaskRow key={task.id} task={task} onComplete={handleComplete} isPending={isPending} />
                ))}
              </>
            )}
            {showFuture.length > 0 && (
              <>
                <p className={`text-[10.5px] font-semibold tracking-[0.3px] text-ink-400 uppercase ${showToday.length > 0 ? "pt-1" : ""}`}>
                  Prossimi giorni
                </p>
                {showFuture.map((task) => (
                  <TaskRow key={task.id} task={task} onComplete={handleComplete} isPending={isPending} />
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-ink-300" />
            <p className="text-[13px] font-medium text-ink-500">Nessuna attività in sospeso</p>
            <p className="text-[12px] text-ink-400">Tutti i follow-up sono completati</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MeetingRow({ event }: { event: UpcomingEvent }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink-900">
          {event.title}
        </p>
        <p className="text-[11.5px] text-ink-400">
          {new Date(event.start).toLocaleDateString("it-IT", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}{" "}
          ·{" "}
          {new Date(event.start).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {event.location && (
            <span className="ml-1 text-ink-300">· {event.location}</span>
          )}
        </p>
      </div>
      {event.meetLink && (
        <a
          href={event.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 items-center gap-1 rounded-[999px] bg-pink/10 px-2.5 text-[11px] font-semibold text-pink hover:bg-pink/20"
        >
          <Video className="h-3 w-3" />
          Meet
        </a>
      )}
    </div>
  )
}

function MeetingsWidget({ events }: { events: UpcomingEvent[] }) {
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]

  const todayEvents = events.filter((e) => e.start.split("T")[0] === todayStr)
  const futureEvents = events.filter((e) => e.start.split("T")[0] !== todayStr)

  return (
    <div className="flex flex-col overflow-hidden rounded-[18px] border border-border-1 bg-surface">
      <div className="flex items-center justify-between border-b border-border-1 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-pink" />
          <h4 className="text-[14px] font-bold text-ink-900">Prossimi meeting</h4>
        </div>
        <Link
          href="/calendario"
          className="flex items-center gap-1 text-[12px] font-medium text-pink hover:underline"
        >
          Vedi tutto
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex-1 px-5 py-3">
        {events.length > 0 ? (
          <div className="space-y-2.5">
            {todayEvents.length > 0 && (
              <>
                <p className="text-[10.5px] font-semibold tracking-[0.3px] text-ink-400 uppercase">Oggi</p>
                {todayEvents.map((event, i) => (
                  <MeetingRow key={`today-${i}`} event={event} />
                ))}
              </>
            )}
            {futureEvents.length > 0 && (
              <>
                <p className={`text-[10.5px] font-semibold tracking-[0.3px] text-ink-400 uppercase ${todayEvents.length > 0 ? "pt-1" : ""}`}>
                  Prossimi giorni
                </p>
                {futureEvents.map((event, i) => (
                  <MeetingRow key={`future-${i}`} event={event} />
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="mb-2 h-8 w-8 text-ink-300" />
            <p className="text-[13px] font-medium text-ink-500">Nessun meeting in programma</p>
            <p className="text-[12px] text-ink-400">I prossimi 7 giorni sono liberi</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskRow({ task, onComplete, isPending }: { task: GoogleTask; onComplete: (id: string) => void; isPending: boolean }) {
  const badge = getTaskDueBadge(task.due)
  const followUp = parseFollowUpLink(task)
  const displayTitle = task.title.replace(/\s*\(\d{2}:\d{2}\)$/, "")

  return (
    <div className="flex items-start gap-2.5">
      <button
        onClick={() => onComplete(task.id)}
        disabled={isPending}
        className="mt-0.5 shrink-0 text-ink-300 hover:text-pink transition-colors"
      >
        <Circle className="h-[16px] w-[16px]" />
      </button>
      <div className="min-w-0 flex-1">
        {followUp ? (
          <p className="truncate text-[13px] font-semibold text-ink-900">
            Follow-up con{" "}
            <Link href={followUp.href} className="text-pink hover:underline">
              {followUp.name}
            </Link>
          </p>
        ) : (
          <p className="truncate text-[13px] font-semibold text-ink-900">
            {displayTitle}
          </p>
        )}
        {badge && (
          <span className={`mt-0.5 inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  )
}

const PROVINCE_TO_REGIONE: Record<string, string> = {}
for (const [regione, provs] of Object.entries(REGIONI_PROVINCE)) {
  for (const p of provs) PROVINCE_TO_REGIONE[p] = regione
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

const DEFAULT_SHORTCUTS = [
  { label: "Script Chiamate", emoji: "📞", href: "/risorse?cat=Script+chiamate" },
  { label: "Template Email", emoji: "✉️", href: "/risorse?cat=Template+email" },
  { label: "Gestione Obiezioni", emoji: "🛡️", href: "/risorse?cat=Gestione+obiezioni" },
  { label: "Listino Prezzi", emoji: "💰", href: "/risorse?cat=Listino" },
]

type MapMarker = { lat: number; lng: number; color: string; province?: string }

// Convex hull for territory outline
function convexHull(points: { lat: number; lng: number }[]) {
  if (points.length < 3) return points
  const pts = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat)
  function cross(o: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng)
  }
  const lower: { lat: number; lng: number }[] = []
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p) }
  const upper: { lat: number; lng: number }[] = []
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p) }
  lower.pop(); upper.pop()
  return lower.concat(upper)
}

function padHull(hull: { lat: number; lng: number }[], pad: number) {
  if (hull.length < 3) return hull
  const cx = hull.reduce((s, p) => s + p.lng, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.lat, 0) / hull.length
  return hull.map((p) => {
    const dx = p.lng - cx, dy = p.lat - cy
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    return { lat: p.lat + (dy / d) * pad, lng: p.lng + (dx / d) * pad }
  })
}

type HomeCardData = { title: string; icon: string | null; link: string | null }
type UpcomingEvent = { title: string; start: string; meetLink: string | null; location: string | null }

export function HomeClient({
  userName,
  mapMarkers = [],
  isAdmin = false,
  homeCards,
  googleConnected = false,
  upcomingEvents = [],
  googleTasks = [],
}: {
  userName: string
  stagesWithCounts: { id: string; label: string; color: string; count: number }[]
  previewByStage: unknown[]
  mapMarkers?: MapMarker[]
  isAdmin?: boolean
  homeCards?: HomeCardData[]
  googleConnected?: boolean
  upcomingEvents?: UpcomingEvent[]
  googleTasks?: GoogleTask[]
}) {
  const firstName = userName.split(" ")[0]
  const shortcuts = homeCards && homeCards.length > 0
    ? homeCards.map((c) => ({ label: c.title, emoji: c.icon ?? "📋", href: c.link ?? "#" }))
    : DEFAULT_SHORTCUTS

  const territoryHulls = useMemo(() => {
    if (isAdmin || mapMarkers.length < 3) return []
    // Group by region to avoid one giant polygon across Italy
    const byRegion: Record<string, { lat: number; lng: number }[]> = {}
    for (const m of mapMarkers) {
      const region = m.province ? (PROVINCE_TO_REGIONE[m.province] ?? "other") : "other"
      if (!byRegion[region]) byRegion[region] = []
      byRegion[region].push({ lat: m.lat, lng: m.lng })
    }
    return Object.values(byRegion)
      .filter((pts) => pts.length >= 3)
      .map((pts) => padHull(convexHull(pts), 0.015))
  }, [mapMarkers, isAdmin])

  return (
    <div className="mx-auto max-w-[1320px] px-9 pt-7 pb-[60px]">
      {/* Hero */}
      <h1 className="mb-1 text-[32px] font-bold leading-tight tracking-[-0.8px] text-ink-900">
        BENVENUTI SALES! 🦈
      </h1>
      <p className="mb-8 max-w-[640px] text-[14px] leading-relaxed text-ink-500">
        In questo Crm troverete tutto quello di cui avete realmente bisogno, tutto in un unico posto,<br />
        pensato da noi per voi, se avete delle modifiche da richiedere scrivete a:{" "}
        <a href="mailto:gabriele.ruzzu@reglo.it" className="font-medium text-pink hover:underline">gabriele.ruzzu@reglo.it</a>
      </p>

      {/* Shortcuts */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {shortcuts.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex items-center justify-center gap-2.5 rounded-[14px] border border-border-1 bg-surface px-4 py-4 text-center transition-all hover:-translate-y-px hover:border-ink-300 hover:shadow-[var(--shadow)]"
          >
            <span className="text-[22px]">{s.emoji}</span>
            <span className="text-[15px] font-semibold text-ink-800">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Map Teaser — full width */}
      <Link
        href="/pipeline/mappa"
        className="group relative mb-6 block h-[300px] w-full overflow-hidden rounded-[22px]"
      >
        {GOOGLE_MAPS_API_KEY ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              defaultCenter={{ lat: 42.0, lng: 12.5 }}
              defaultZoom={isAdmin ? 5.5 : 6}
              gestureHandling="none"
              disableDefaultUI={true}
              mapId="reglo-home-map"
              style={{ width: "100%", height: "100%" }}
              clickableIcons={false}
            >
              {territoryHulls.map((hull, i) => (
                <Polygon
                  key={i}
                  paths={hull}
                  strokeColor="#EC4899"
                  strokeOpacity={0.7}
                  strokeWeight={2}
                  fillColor="#EC4899"
                  fillOpacity={0.08}
                />
              ))}
              {mapMarkers.slice(0, 200).map((m, i) => (
                <AdvancedMarker key={i} position={{ lat: m.lat, lng: m.lng }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: m.color,
                      border: "1px solid white",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    }}
                  />
                </AdvancedMarker>
              ))}
            </GoogleMap>
          </APIProvider>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
          >
            <p className="text-[14px] text-white/40">Mappa territorio</p>
          </div>
        )}
        {/* Overlay expand icon */}
        <div className="pointer-events-none absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/80 text-ink-600 shadow-sm transition-colors group-hover:bg-white">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </Link>

      {/* Upcoming Meetings + Grain — two cards side by side */}
      <div className="grid grid-cols-2 items-start gap-4">
        {/* Upcoming Meetings */}
        {googleConnected ? (
          <MeetingsWidget events={upcomingEvents} />
        ) : (
          <div className="flex flex-col items-center justify-center overflow-hidden rounded-[18px] border border-border-1 bg-surface px-6 py-8 text-center">
            <Calendar className="mb-3 h-10 w-10 text-ink-300" />
            <h4 className="mb-1.5 text-[15px] font-bold text-ink-900">Collega Google Calendar</h4>
            <p className="mb-4 text-[12.5px] leading-relaxed text-ink-500">
              Visualizza i tuoi meeting e crea appuntamenti con Google Meet direttamente dal CRM.
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="flex h-[34px] items-center gap-2 rounded-[999px] bg-pink px-4 text-[12.5px] font-semibold text-white hover:bg-pink/90"
            >
              Collega Google
            </button>
          </div>
        )}

        {/* Tasks Widget */}
        {googleConnected ? (
          <TasksWidget tasks={googleTasks} />
        ) : (
          <div className="flex flex-col items-center justify-center overflow-hidden rounded-[18px] border border-border-1 bg-surface px-6 py-8 text-center">
            <ListChecks className="mb-3 h-10 w-10 text-ink-300" />
            <h4 className="mb-1.5 text-[15px] font-bold text-ink-900">Collega Google Calendar</h4>
            <p className="mb-4 text-[12.5px] leading-relaxed text-ink-500">
              Visualizza le tue attività e follow-up direttamente dal CRM.
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="flex h-[34px] items-center gap-2 rounded-[999px] bg-pink px-4 text-[12.5px] font-semibold text-white hover:bg-pink/90"
            >
              Collega Google
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
