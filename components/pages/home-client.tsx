"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Polygon,
} from "@vis.gl/react-google-maps"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

const SHORTCUTS = [
  { label: "Script Chiamate", emoji: "📞", href: "/risorse?cat=Script+chiamate" },
  { label: "Template Email", emoji: "✉️", href: "/risorse?cat=Template+email" },
  { label: "Gestione Obiezioni", emoji: "🛡️", href: "/risorse?cat=Gestione+obiezioni" },
  { label: "Listino Prezzi", emoji: "💰", href: "/risorse?cat=Listino" },
]

type MapMarker = { lat: number; lng: number; color: string }

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

export function HomeClient({
  userName,
  mapMarkers = [],
  isAdmin = false,
}: {
  userName: string
  stagesWithCounts: { id: string; label: string; color: string; count: number }[]
  previewByStage: unknown[]
  mapMarkers?: MapMarker[]
  isAdmin?: boolean
}) {
  const firstName = userName.split(" ")[0]

  const territoryHull = useMemo(() => {
    if (isAdmin || mapMarkers.length < 3) return null
    return padHull(convexHull(mapMarkers), 0.04)
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
              {territoryHull && (
                <Polygon
                  paths={territoryHull}
                  strokeColor="#EC4899"
                  strokeOpacity={0.7}
                  strokeWeight={2}
                  fillColor="#EC4899"
                  fillOpacity={0.08}
                />
              )}
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
