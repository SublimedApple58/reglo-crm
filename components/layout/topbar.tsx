"use client"

import { useState, useEffect, useTransition, useCallback, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Bell, ChevronRight, Plus, X, Phone, Mail, Video, Sparkles, MessageSquare, Building, Search, Users } from "lucide-react"
import { createAutoscuola, getRecentActivities, searchGlobal } from "@/lib/actions/autoscuole"
import { STAGES } from "@/lib/constants"

const BREADCRUMB_MAP: Record<string, { label: string; href?: string }[]> = {
  "/": [{ label: "Home" }],
  "/bacheca": [{ label: "Bacheca news" }],
  "/pipeline": [{ label: "Vendite", href: "/pipeline" }, { label: "Pipeline" }],
  "/pipeline/mappa": [
    { label: "Vendite", href: "/pipeline" },
    { label: "Pipeline", href: "/pipeline" },
    { label: "Mappa territorio" },
  ],
  "/commissioni": [{ label: "Vendite", href: "/pipeline" }, { label: "Commissioni" }],
  "/risorse": [{ label: "Vendite", href: "/pipeline" }, { label: "Risorse" }],
  "/profilo": [{ label: "Profilo" }],
  "/admin/gestione-sales": [{ label: "Admin" }, { label: "Gestione Sales" }],
  "/admin/assegnazioni": [{ label: "Admin" }, { label: "Assegnazioni" }],
  "/admin/gestione-risorse": [{ label: "Admin" }, { label: "Gestione Risorse" }],
  "/admin/gestione-news": [{ label: "Admin" }, { label: "Gestione News" }],
}

type ActivityResult = {
  activity: { id: number; type: string; title: string; createdAt: Date }
  user: { name: string; color: string }
  autoscuola: { name: string }
}

type SearchResult = {
  autoscuole: { id: string; name: string; town: string; province: string }[]
  users: { id: string; name: string; email: string; role: string }[]
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showNewOpp, setShowNewOpp] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [notifications, setNotifications] = useState<ActivityResult[]>([])
  const [hasRecent, setHasRecent] = useState(false)

  // Handle dynamic routes
  let breadcrumbs = BREADCRUMB_MAP[pathname]
  if (!breadcrumbs) {
    if (pathname.startsWith("/autoscuola/")) {
      breadcrumbs = [
        { label: "Vendite", href: "/pipeline" },
        { label: "Pipeline", href: "/pipeline" },
        { label: "Scheda autoscuola" },
      ]
    } else {
      breadcrumbs = [{ label: "Home" }]
    }
  }

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center gap-3 border-b border-border-1 bg-surface px-5">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 text-ink-400" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-700"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={`text-[13px] ${
                      isLast ? "font-semibold text-ink-900" : "font-medium text-ink-500"
                    }`}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* Right actions */}
        <NotificationBell />

        <div className="h-5 w-px bg-border-1" />

        <button
          onClick={() => setShowNewOpp(true)}
          className="flex h-8 items-center gap-1.5 rounded-[999px] bg-pink px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-pink/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuova opp.
        </button>
      </header>

      {/* New opportunity dialog */}
      {showNewOpp && (
        <NewOppDialog onClose={() => setShowNewOpp(false)} />
      )}

      {/* Search dialog */}
      {showSearch && (
        <CommandPalette onClose={() => setShowSearch(false)} />
      )}
    </>
  )
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<ActivityResult[]>([])
  const [hasRecent, setHasRecent] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleOpen() {
    setOpen(!open)
    if (!loaded) {
      const results = await getRecentActivities(10)
      setNotifications(results as unknown as ActivityResult[])
      const now = Date.now()
      const hasNew = results.some((r) => {
        const created = new Date(r.activity.createdAt).getTime()
        return now - created < 24 * 60 * 60 * 1000
      })
      setHasRecent(hasNew)
      setLoaded(true)
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "call": return Phone
      case "email": return Mail
      case "meeting": return Video
      case "stage_change": return Sparkles
      default: return MessageSquare
    }
  }

  function timeAgo(date: Date) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m fa`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h fa`
    const days = Math.floor(hours / 24)
    return `${days}g fa`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-2 hover:text-ink-700"
      >
        <Bell className="h-[16px] w-[16px]" />
        {hasRecent && (
          <span className="absolute right-[6px] top-[6px] h-[6px] w-[6px] rounded-full bg-pink" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] rounded-[16px] border border-border-1 bg-surface shadow-lg">
          <div className="border-b border-border-1 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-ink-900">Notifiche</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-ink-400">
                Nessuna attività recente
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcon(n.activity.type)
                return (
                  <div
                    key={n.activity.id}
                    className="flex items-start gap-3 border-b border-border-2 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: n.user.color + "20" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: n.user.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-ink-900">{n.activity.title}</p>
                      <p className="text-[11px] text-ink-400">
                        {n.user.name} · {n.autoscuola.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10.5px] text-ink-400">
                      {timeAgo(n.activity.createdAt)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NewOppDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: "",
    owner: "",
    province: "",
    town: "",
    phone: "",
    email: "",
    stageId: "da_chiamare",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.province || !form.town) return
    startTransition(async () => {
      const id = await createAutoscuola(form)
      onClose()
      router.push(`/autoscuola/${id}`)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[520px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">Nuova opportunità</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Nome autoscuola *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              placeholder="Autoscuola XYZ"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Titolare</label>
            <input
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              placeholder="Mario Rossi"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Provincia *</label>
              <input
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value.toUpperCase().slice(0, 2) })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="RM"
                maxLength={2}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Città *</label>
              <input
                value={form.town}
                onChange={(e) => setForm({ ...form, town: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="Roma"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Telefono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="+39 06 1234 5678"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="info@autoscuola.it"
                type="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Stage iniziale</label>
            <select
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
            >
              {isPending ? "Creazione..." : "Crea opportunità"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult>({ autoscuole: [], users: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (query.length < 2) {
      setResults({ autoscuole: [], users: [] })
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      const r = await searchGlobal(query)
      setResults(r)
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const hasResults = results.autoscuole.length > 0 || results.users.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]" onClick={onClose}>
      <div
        className="w-[560px] overflow-hidden rounded-[16px] border border-border-1 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border-1 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca autoscuole, utenti..."
            className="flex-1 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
          />
          <kbd className="rounded-[4px] border border-border-2 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-[13px] text-ink-400">Ricerca...</div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div className="p-6 text-center text-[13px] text-ink-400">Nessun risultato</div>
          )}

          {!loading && results.autoscuole.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10.5px] font-semibold tracking-wider text-ink-400 uppercase">
                Autoscuole
              </div>
              {results.autoscuole.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    router.push(`/autoscuola/${a.id}`)
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <Building className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">{a.name}</p>
                    <p className="text-[11px] text-ink-400">{a.town}, {a.province}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && results.users.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10.5px] font-semibold tracking-wider text-ink-400 uppercase">
                Utenti
              </div>
              {results.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    router.push("/admin/gestione-sales")
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <Users className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">{u.name}</p>
                    <p className="text-[11px] text-ink-400">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="p-6 text-center text-[13px] text-ink-400">
              Digita almeno 2 caratteri per cercare
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
