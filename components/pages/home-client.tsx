"use client"

import Link from "next/link"
import {
  Map,
  ArrowUpRight,
} from "lucide-react"

const SHORTCUTS = [
  { label: "Script Chiamate", emoji: "📞", href: "/risorse" },
  { label: "Template Email", emoji: "✉️", href: "/risorse" },
  { label: "Gestione Obiezioni", emoji: "🛡️", href: "/risorse" },
  { label: "Listino Prezzi", emoji: "💰", href: "/risorse" },
]

export function HomeClient({
  userName,
}: {
  userName: string
  stagesWithCounts: { id: string; label: string; color: string; count: number }[]
  previewByStage: unknown[]
}) {
  const firstName = userName.split(" ")[0]

  return (
    <div className="mx-auto max-w-[1320px] px-9 pt-7 pb-[60px]">
      {/* Hero */}
      <h1 className="mb-1 text-[32px] font-bold leading-tight tracking-[-0.8px] text-ink-900">
        Ciao {firstName} 👋
      </h1>
      <p className="mb-8 max-w-[640px] text-[14px] leading-relaxed text-ink-500">
        Ecco la tua dashboard. Gestisci la pipeline, monitora le commissioni e accedi alle risorse
        del team.
      </p>

      {/* Shortcuts */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex items-center justify-center gap-2.5 rounded-[14px] border border-border-1 bg-surface px-4 py-4 text-center transition-all hover:-translate-y-px hover:border-ink-300 hover:shadow-[var(--shadow)]"
          >
            <span className="text-[20px]">{s.emoji}</span>
            <span className="text-[13px] font-semibold text-ink-800">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Map Teaser — full width */}
      <Link
        href="/pipeline/mappa"
        className="group relative mb-6 flex h-[300px] w-full items-end overflow-hidden rounded-[22px]"
      >
        {/* Dark map background */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          }}
        />
        {/* Decorative map grid */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />
        {/* Italy silhouette placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Map className="h-32 w-32 text-white/[0.06]" />
        </div>
        {/* Territory label */}
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
          <span className="rounded-[6px] bg-[#3B82F6]/80 px-3 py-1 text-[10px] font-bold tracking-[1px] text-white uppercase backdrop-blur-sm">
            Territorio attivo
          </span>
          {/* Dashed border box */}
          <div className="mt-2 h-[120px] w-[160px] -translate-x-[10px] rounded-[4px] border-2 border-dashed border-[#3B82F6]/40" />
        </div>
        {/* Bottom-right expand icon */}
        <div className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/10 text-white/60 backdrop-blur-sm transition-colors group-hover:bg-white/20">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </Link>

      {/* Cal.com + Grain — two cards side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cal.com */}
        <a
          href="https://cal.com/reglo?redirect=false"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex overflow-hidden rounded-[18px] border border-border-1 bg-[#1a1a2e] transition-all hover:-translate-y-px hover:shadow-lg"
        >
          <div className="flex flex-1 flex-col justify-center px-6 py-5">
            <h4 className="mb-1.5 text-[16px] font-bold text-white">
              Reglo | Cal.com
            </h4>
            <p className="mb-3 text-[12.5px] leading-[1.6] text-white/50">
              Cal è l&apos;organizzatore N*1 per prenotare appuntamenti, non lasciartene scappare nessuno.
            </p>
            <div className="flex items-center gap-2">
              <img src="/cal-logo.png" alt="Cal" className="h-5 w-5 rounded-[4px]" />
              <span className="text-[12px] text-white/40 underline decoration-white/20 underline-offset-2">
                https://cal.com/reglo?redirect=false
              </span>
            </div>
          </div>
          <div className="w-[170px] shrink-0 self-stretch overflow-hidden">
            <img src="/cal-papero.png" alt="" className="h-[115%] w-full object-cover -mt-[5%]" />
          </div>
        </a>

        {/* Grain */}
        <a
          href="https://grain.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex overflow-hidden rounded-[18px] border border-border-1 bg-[#1a1a2e] transition-all hover:-translate-y-px hover:shadow-lg"
        >
          <div className="flex flex-1 flex-col justify-center px-6 py-5">
            <h4 className="mb-1.5 text-[16px] font-bold text-white">
              Grain | The AI Notetaker
            </h4>
            <p className="mb-3 text-[12.5px] leading-[1.6] text-white/50">
              Grain usa il potere dell&apos;AI per registrare i tuoi meeting e rendere la vendita più veloce.
            </p>
            <div className="flex items-center gap-2">
              <img src="/grain-logo.svg" alt="Grain" className="h-5 w-5" />
              <span className="text-[12px] text-white/40 underline decoration-white/20 underline-offset-2">
                https://grain.com/
              </span>
            </div>
          </div>
          <div className="w-[170px] shrink-0 self-stretch overflow-hidden">
            <img src="/grain-papero.png" alt="" className="h-[115%] w-full object-cover -mt-[5%]" />
          </div>
        </a>
      </div>
    </div>
  )
}
