"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, ChevronRight, Plus } from "lucide-react"

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
}

export function Topbar() {
  const pathname = usePathname()

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

  return (
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
      <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-2 hover:text-ink-700">
        <Bell className="h-[16px] w-[16px]" />
        <span className="absolute right-[6px] top-[6px] h-[6px] w-[6px] rounded-full bg-pink" />
      </button>

      <div className="h-5 w-px bg-border-1" />

      <Link
        href="/pipeline"
        className="flex h-8 items-center gap-1.5 rounded-[999px] bg-pink px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-pink/90"
      >
        <Plus className="h-3.5 w-3.5" />
        Nuova opp.
      </Link>
    </header>
  )
}
