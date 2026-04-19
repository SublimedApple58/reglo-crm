"use client"

import Link from "next/link"
import {
  Phone,
  Mail,
  Shield,
  FileText,
  BookOpen,
  Map,
  ArrowRight,
  Calendar,
  Mic,
  ExternalLink,
} from "lucide-react"
import type { Autoscuola } from "@/lib/db/schema"

const SHORTCUTS = [
  { label: "Script", emoji: "📞", icon: Phone, href: "/risorse", color: "#EC4899" },
  { label: "Template", emoji: "📧", icon: Mail, href: "/risorse", color: "#3B82F6" },
  { label: "Obiezioni", emoji: "🛡️", icon: Shield, href: "/risorse", color: "#F97316" },
  { label: "Listino", emoji: "📋", icon: FileText, href: "/risorse", color: "#10B981" },
  { label: "Procedure", emoji: "📖", icon: BookOpen, href: "/risorse", color: "#8B5CF6" },
]

type StagePreview = {
  id: string
  label: string
  color: string
  count: number
  items: Autoscuola[]
}

export function HomeClient({
  userName,
  stagesWithCounts,
  previewByStage,
}: {
  userName: string
  stagesWithCounts: { id: string; label: string; color: string; count: number }[]
  previewByStage: StagePreview[]
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
      <div className="mb-6 grid grid-cols-5 gap-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex flex-col items-center gap-2 rounded-[14px] border border-border-1 bg-surface p-4 text-center transition-all hover:-translate-y-px hover:border-ink-300 hover:shadow-[var(--shadow)]"
          >
            <span className="text-[22px]">{s.emoji}</span>
            <span className="text-[12.5px] font-semibold text-ink-700">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Two-column: Map Teaser + Integrations */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Map Teaser */}
        <Link
          href="/pipeline/mappa"
          className="group relative flex h-[260px] items-end overflow-hidden rounded-[22px] p-6"
          style={{
            background: "linear-gradient(180deg, #0B1220 0%, #111F33 100%)",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Map className="h-24 w-24 text-white/10" />
          </div>
          <div className="relative z-10">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-white/60 uppercase">
              Il tuo territorio
            </p>
            <h3 className="mb-2 text-[18px] font-bold text-white">Mappa autoscuole</h3>
            <span className="inline-flex items-center gap-1 rounded-[999px] bg-white/10 px-3 py-1 text-[11.5px] font-semibold text-white/90 backdrop-blur-sm transition-colors group-hover:bg-white/20">
              Esplora
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        {/* Integrations */}
        <div className="grid grid-rows-2 gap-3">
          <a href="https://cal.com" target="_blank" rel="noopener noreferrer" className="group relative flex overflow-hidden rounded-[14px] border border-border-1 transition-all hover:-translate-y-px hover:shadow-[var(--shadow)]">
            <ExternalLink className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-white/40 transition-colors group-hover:text-white/70" />
            <div className="flex flex-1 flex-col justify-center bg-[#0B1220] px-5 py-4">
              <p className="mb-0.5 text-[10.5px] font-medium text-white/50 uppercase">Integrazione</p>
              <h4 className="mb-1 text-[15px] font-bold text-white">Cal.com</h4>
              <p className="text-[12px] leading-relaxed text-white/60">
                Sincronizza il tuo calendario e fissa meeting direttamente dalla pipeline.
              </p>
            </div>
            <div className="flex w-[130px] items-center justify-center border-l border-border-2 bg-surface">
              <Calendar className="h-[26px] w-[26px] text-ink-400" />
            </div>
          </a>
          <a href="https://grain.com" target="_blank" rel="noopener noreferrer" className="group relative flex overflow-hidden rounded-[14px] border border-border-1 transition-all hover:-translate-y-px hover:shadow-[var(--shadow)]">
            <ExternalLink className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-white/40 transition-colors group-hover:text-white/70" />
            <div className="flex flex-1 flex-col justify-center bg-[#0B1220] px-5 py-4">
              <p className="mb-0.5 text-[10.5px] font-medium text-white/50 uppercase">Integrazione</p>
              <h4 className="mb-1 text-[15px] font-bold text-white">Grain</h4>
              <p className="text-[12px] leading-relaxed text-white/60">
                Registra e analizza le tue chiamate con AI per migliorare le conversioni.
              </p>
            </div>
            <div className="flex w-[130px] items-center justify-center border-l border-border-2 bg-surface">
              <Mic className="h-[26px] w-[26px] text-ink-400" />
            </div>
          </a>
        </div>
      </div>

      {/* Pipeline Preview */}
      <div className="rounded-[22px] border border-border-1 bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="mb-1 text-[11px] font-medium text-ink-400">🐚 Pipeline</p>
            <h2 className="text-[20px] font-bold tracking-tight text-ink-900">Outbound</h2>
          </div>
          <Link
            href="/pipeline"
            className="flex items-center gap-1 rounded-[999px] border border-border-1 px-3.5 py-1.5 text-[12px] font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-surface-2"
          >
            Apri pipeline
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto">
          {previewByStage.map((stage) => (
            <div key={stage.id} className="min-w-[200px] flex-1">
              <div
                className="mb-2 flex items-center gap-2 rounded-t-[12px] px-3 py-2"
                style={{ backgroundColor: stage.color + "12" }}
              >
                <span
                  className="inline-block h-[6px] w-[6px] rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-[11.5px] font-semibold" style={{ color: stage.color }}>
                  {stage.label}
                </span>
                <span
                  className="ml-auto rounded-full bg-white px-2 py-0.5 font-mono text-[10px]"
                  style={{ color: stage.color }}
                >
                  {stage.count}
                </span>
              </div>
              <div className="space-y-1.5">
                {stage.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/autoscuola/${item.id}`}
                    className="block rounded-[10px] border border-border-2 bg-surface p-2.5 transition-all hover:-translate-y-px hover:shadow-sm"
                    style={{ borderLeft: `3px solid ${stage.color}` }}
                  >
                    <p className="text-[12px] font-semibold leading-tight text-ink-900">
                      {item.name.replace("Autoscuola ", "")}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-ink-400">
                      {item.town}, {item.province}
                    </p>
                  </Link>
                ))}
                {stage.count > 3 && (
                  <p className="px-2 text-[10.5px] text-ink-400">
                    +{stage.count - 3} altre
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
