"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Home,
  Newspaper,
  Kanban,
  Map,
  DollarSign,
  BookOpen,
  Users,
  ArrowLeftRight,
  FileEdit,
  User,
  Search,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  MoreHorizontal,
  LogOut,
  Megaphone,
} from "lucide-react"
import { getPipelineCounts, searchGlobal } from "@/lib/actions/autoscuole"
import { getAdminStats } from "@/lib/actions/data"

const salesNavItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Bacheca news", href: "/bacheca", icon: Newspaper },
]

const venditaItems = [
  { label: "Pipeline", href: "/pipeline", icon: Kanban, badgeKey: "pipeline" as const },
  { label: "Mappa territorio", href: "/pipeline/mappa", icon: Map, depth: 1 },
  { label: "Commissioni", href: "/commissioni", icon: DollarSign },
  { label: "Risorse", href: "/risorse", icon: BookOpen },
]

const adminItems = [
  { label: "Gestione sales", href: "/admin/gestione-sales", icon: Users },
  { label: "Assegnazioni", href: "/admin/assegnazioni", icon: ArrowLeftRight, badgeKey: "unassigned" as const },
  { label: "Gestione risorse", href: "/admin/gestione-risorse", icon: FileEdit },
  { label: "Gestione news", href: "/admin/gestione-news", icon: Megaphone },
]

type BadgeCounts = {
  pipeline: number
  unassigned: number
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [venditaOpen, setVenditaOpen] = useState(true)
  const [adminOpen, setAdminOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [badges, setBadges] = useState<BadgeCounts>({ pipeline: 0, unassigned: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const role = (session?.user as Record<string, unknown>)?.role as string | undefined
  const showAdmin = role === "admin" || role === "both"
  const userName = session?.user?.name ?? "Sales"
  const territory = (session?.user as Record<string, unknown>)?.territory as string ?? ""
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Load badge counts
  useEffect(() => {
    async function loadBadges() {
      try {
        const [counts, stats] = await Promise.all([getPipelineCounts(), getAdminStats()])
        const total = counts.reduce((sum, c) => sum + c.count, 0)
        setBadges({ pipeline: total, unassigned: stats.unassigned })
      } catch {
        // ignore
      }
    }
    loadBadges()
  }, [pathname]) // reload on navigation

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  function getBadgeValue(key: "pipeline" | "unassigned") {
    return badges[key] || 0
  }

  return (
    <>
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-border-1 bg-bg">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 pt-5 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-ink-900 text-[13px] font-bold text-white">
            R
          </div>
          <div>
            <div className="text-[16px] font-bold leading-none tracking-tight text-ink-900">
              reglo<span className="text-pink">.</span>
            </div>
            <div className="text-[10.5px] font-medium tracking-[0.5px] text-ink-400 uppercase">
              CRM Sales
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-[32px] w-full items-center gap-2 rounded-[999px] border border-border-1 bg-surface px-3 text-[12.5px] text-ink-400 transition-colors hover:border-ink-300"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Cerca…</span>
            <kbd className="ml-auto rounded-[4px] border border-border-2 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {/* Main items */}
          {salesNavItems.map((item) => (
            <NavRow key={item.href} item={item} isActive={isActive(item.href)} />
          ))}

          {/* Vendite section */}
          <div className="mt-4">
            <button
              onClick={() => setVenditaOpen(!venditaOpen)}
              className="mb-1 flex w-full items-center gap-1 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.5px] text-ink-400 uppercase"
            >
              {venditaOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Vendite
            </button>
            {venditaOpen &&
              venditaItems.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  badgeValue={item.badgeKey ? getBadgeValue(item.badgeKey) : undefined}
                />
              ))}
          </div>

          {/* Admin section */}
          {showAdmin && (
            <div className="mt-4">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="mb-1 flex w-full items-center gap-1 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.5px] text-ink-400 uppercase"
              >
                {adminOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Admin
              </button>
              {adminOpen &&
                adminItems.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    badgeValue={item.badgeKey ? getBadgeValue(item.badgeKey) : undefined}
                  />
                ))}
            </div>
          )}

          {/* Profile */}
          <div className="mt-4">
            <NavRow
              item={{ label: "Profilo", href: "/profilo", icon: User }}
              isActive={isActive("/profilo")}
            />
          </div>
        </nav>

        {/* Tip Card */}
        <div className="mx-3 mb-3 rounded-[14px] border border-[#FDE68A] bg-yellow-50 p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-[#B45309]" />
            <span className="text-[10px] font-bold tracking-[0.8px] text-[#B45309] uppercase">TIP</span>
          </div>
          <p className="text-[11.5px] leading-[1.5] text-[#7C2D12]">
            Usa i filtri per provincia nella pipeline per concentrarti sulle zone prioritarie.
          </p>
        </div>

        {/* User card */}
        <div className="relative flex items-center gap-2.5 border-t border-border-1 px-4 py-3" ref={menuRef}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink-900">{userName}</div>
            <div className="truncate text-[11px] text-ink-400">{territory}</div>
          </div>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-400 hover:bg-surface-2 hover:text-ink-600"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-3 z-50 mb-2 w-[180px] rounded-[10px] border border-border-1 bg-surface py-1 shadow-lg">
              <Link
                href="/profilo"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-ink-700 hover:bg-surface-2"
              >
                <User className="h-3.5 w-3.5" />
                Profilo
              </Link>
              <div className="my-1 h-px bg-border-1" />
              <button
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-red-500 hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Command palette triggered from sidebar search */}
      {showSearch && (
        <SearchDialog onClose={() => setShowSearch(false)} />
      )}
    </>
  )
}

function NavRow({
  item,
  isActive,
  badgeValue,
}: {
  item: {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    depth?: number
  }
  isActive: boolean
  badgeValue?: number
}) {
  const Icon = item.icon
  const depth = item.depth ?? 0
  const paddingLeft = 10 + depth * 14

  return (
    <Link
      href={item.href}
      className="flex items-center gap-2 rounded-[999px] py-[7px] pr-[10px] text-[13px] font-medium transition-colors"
      style={{
        paddingLeft,
        color: isActive ? "#EC4899" : "#1E293B",
        backgroundColor: isActive ? "#FDF2F8" : "transparent",
        fontWeight: isActive ? 600 : 500,
      }}
    >
      <Icon className="h-[16px] w-[16px] shrink-0" />
      <span className="flex-1">{item.label}</span>
      {badgeValue !== undefined && badgeValue > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-surface-2 px-1 font-mono text-[10px] text-ink-400">
          {badgeValue}
        </span>
      )}
    </Link>
  )
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchGlobal>>>({ autoscuole: [], users: [] })
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
                  <Kanban className="h-4 w-4 shrink-0 text-ink-400" />
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
