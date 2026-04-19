"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
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
} from "lucide-react"

const salesNavItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Bacheca news", href: "/bacheca", icon: Newspaper, badge: true },
]

const venditaItems = [
  { label: "Pipeline", href: "/pipeline", icon: Kanban, badge: true },
  { label: "Mappa territorio", href: "/pipeline/mappa", icon: Map, depth: 1 },
  { label: "Commissioni", href: "/commissioni", icon: DollarSign },
  { label: "Risorse", href: "/risorse", icon: BookOpen, badge: true },
]

const adminItems = [
  { label: "Gestione sales", href: "/admin/gestione-sales", icon: Users },
  { label: "Assegnazioni", href: "/admin/assegnazioni", icon: ArrowLeftRight, badge: true },
  { label: "Gestione risorse", href: "/admin/gestione-risorse", icon: FileEdit },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [venditaOpen, setVenditaOpen] = useState(true)
  const [adminOpen, setAdminOpen] = useState(true)

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

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
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
        <button className="flex h-[32px] w-full items-center gap-2 rounded-[999px] border border-border-1 bg-surface px-3 text-[12.5px] text-ink-400 transition-colors hover:border-ink-300">
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
              <NavRow key={item.href} item={item} isActive={isActive(item.href)} />
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
                <NavRow key={item.href} item={item} isActive={isActive(item.href)} />
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
      <div className="flex items-center gap-2.5 border-t border-border-1 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink-900">{userName}</div>
          <div className="truncate text-[11px] text-ink-400">{territory}</div>
        </div>
        <button className="flex h-6 w-6 items-center justify-center rounded-md text-ink-400 hover:bg-surface-2 hover:text-ink-600">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}

function NavRow({
  item,
  isActive,
}: {
  item: {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    depth?: number
    badge?: boolean
  }
  isActive: boolean
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
      {item.badge && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-surface-2 px-1 font-mono text-[10px] text-ink-400">
          •
        </span>
      )}
    </Link>
  )
}
