"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  MoreHorizontal,
  LogOut,
  Megaphone,
} from "lucide-react"
import { getPipelineCounts } from "@/lib/actions/autoscuole"
import { getAdminStats } from "@/lib/actions/data"

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Bacheca news", href: "/bacheca", icon: Newspaper },
  { label: "Pipeline", href: "/pipeline", icon: Kanban, badgeKey: "pipeline" as const },
  { label: "Mappa territorio", href: "/pipeline/mappa", icon: Map },
  { label: "Commissioni", href: "/commissioni", icon: DollarSign },
  { label: "Risorse", href: "/risorse", icon: BookOpen },
  { label: "Profilo", href: "/profilo", icon: User },
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
  const { data: session } = useSession()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [badges, setBadges] = useState<BadgeCounts>({ pipeline: 0, unassigned: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const role = (session?.user as Record<string, unknown>)?.role as string | undefined
  const showAdmin = role === "admin" || role === "both"
  const userName = session?.user?.name ?? "Sales"
  const territory = (session?.user as Record<string, unknown>)?.territory as string ?? ""
  const avatar = (session?.user as Record<string, unknown>)?.avatar as string | undefined

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
          <img src="/reglo-logo.png" alt="Reglo" className="h-8 w-8 rounded-[8px]" />
          <div>
            <div className="text-[16px] font-bold leading-none tracking-tight text-ink-900">
              reglo<span className="text-pink">.</span>
            </div>
            <div className="text-[10.5px] font-medium tracking-[0.5px] text-ink-400 uppercase">
              CRM Sales
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {navItems.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              badgeValue={"badgeKey" in item && item.badgeKey ? getBadgeValue(item.badgeKey) : undefined}
            />
          ))}

          {/* Admin section */}
          {showAdmin && (
            <div className="mt-4">
              <div className="mb-1 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.5px] text-ink-400 uppercase">
                Admin
              </div>
              {adminItems.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  badgeValue={item.badgeKey ? getBadgeValue(item.badgeKey) : undefined}
                />
              ))}
            </div>
          )}
        </nav>

        {/* User card */}
        <div className="relative flex items-center gap-2.5 border-t border-border-1 px-4 py-3" ref={menuRef}>
          {avatar ? (
            <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-white">
              {userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
          )}
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

