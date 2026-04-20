"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Search } from "lucide-react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps"
import { STAGES, PROVINCES_LAZIO } from "@/lib/constants"
import { StageChip } from "@/components/ui/stage-chip"

type MapAutoscuola = {
  id: string
  name: string
  province: string
  town: string
  stageId: string
  lat: number | null
  lng: number | null
  stageColor: string
  stageLabel: string
  pipelineValue: number | null
  students: number | null
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

// ── Individual marker with hover InfoWindow ──────────────────────────
function AutoscuolaMarker({
  a,
  isHovered,
  onHover,
  onLeave,
}: {
  a: MapAutoscuola
  isHovered: boolean
  onHover: (id: string) => void
  onLeave: () => void
}) {
  const router = useRouter()
  const [markerRef, marker] = useAdvancedMarkerRef()

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: a.lat!, lng: a.lng! }}
        onClick={() => router.push(`/autoscuola/${a.id}`)}
        onMouseEnter={() => onHover(a.id)}
        onMouseLeave={onLeave}
        zIndex={isHovered ? 20 : 1}
        style={{ cursor: "pointer" }}
      >
        {/* 12x12 colored circle pin */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: a.stageColor,
            border: "2px solid white",
            boxShadow: isHovered
              ? `0 0 8px ${a.stageColor}80`
              : "0 1px 3px rgba(0,0,0,0.2)",
            transform: isHovered ? "scale(1.35)" : "scale(1)",
            transition: "transform 150ms ease, box-shadow 150ms ease",
          }}
        />
      </AdvancedMarker>

      {isHovered && marker && (
        <InfoWindow
          anchor={marker}
          shouldFocus={false}
          headerContent={null}
          pixelOffset={[0, -2]}
          onCloseClick={onLeave}
        >
          <div style={{ padding: 4, minWidth: 120 }}>
            <p
              style={{
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#0f172a",
                margin: 0,
              }}
            >
              {a.name.replace("Autoscuola ", "")}
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                margin: "2px 0 6px",
              }}
            >
              {a.town}, {a.province}
            </p>
            <StageChip stageId={a.stageId} size="sm" />
          </div>
        </InfoWindow>
      )}
    </>
  )
}

// ── CSS fallback map (no API key) ────────────────────────────────────
function CssFallbackMap({
  filtered,
  hoveredId,
  setHoveredId,
}: {
  filtered: MapAutoscuola[]
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
}) {
  return (
    <div className="relative bg-[#E7ECEE]">
      <div className="relative h-full w-full overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            opacity: 0.3,
          }}
        />

        {/* Pins */}
        {filtered.map((a) => {
          if (!a.lat || !a.lng) return null
          const x = ((a.lng - 11.5) / 2.5) * 100
          const y = ((43.0 - a.lat) / 2.0) * 100
          const isHovered = hoveredId === a.id

          return (
            <Link
              key={a.id}
              href={`/autoscuola/${a.id}`}
              className="absolute transition-transform"
              style={{
                left: `${Math.min(95, Math.max(5, x))}%`,
                top: `${Math.min(90, Math.max(10, y))}%`,
                transform: isHovered ? "scale(1.35)" : "scale(1)",
                zIndex: isHovered ? 20 : 1,
              }}
              onMouseEnter={() => setHoveredId(a.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="h-3 w-3 rounded-full border-2 border-white"
                style={{
                  backgroundColor: a.stageColor,
                  boxShadow: isHovered
                    ? `0 0 8px ${a.stageColor}80`
                    : "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
              {isHovered && (
                <div className="absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 rounded-[14px] border border-border-1 bg-white p-3 shadow-lg whitespace-nowrap">
                  <p className="text-[12.5px] font-semibold text-ink-900">
                    {a.name.replace("Autoscuola ", "")}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {a.town}, {a.province}
                  </p>
                  <StageChip stageId={a.stageId} size="sm" />
                </div>
              )}
            </Link>
          )
        })}

        {/* Province labels */}
        {PROVINCES_LAZIO.map((p) => {
          const x = ((p.lng - 11.5) / 2.5) * 100
          const y = ((43.0 - p.lat) / 2.0) * 100
          return (
            <div
              key={p.code}
              className="pointer-events-none absolute text-[11px] font-bold text-ink-400/60 uppercase"
              style={{
                left: `${Math.min(90, Math.max(10, x))}%`,
                top: `${Math.min(85, Math.max(15, y + 3))}%`,
              }}
            >
              {p.name}
            </div>
          )
        })}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 rounded-[14px] border border-border-1 bg-white/90 p-3 backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold tracking-wider text-ink-400 uppercase">
            Stage
          </p>
          <div className="space-y-1">
            {STAGES.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[10.5px] text-ink-600">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Note about Google Maps */}
        <div className="absolute top-4 right-4 rounded-[10px] border border-border-1 bg-white/90 px-3 py-2 text-[11px] text-ink-500 backdrop-blur-sm">
          <MapPin className="mb-1 inline h-3 w-3 text-pink" /> Aggiungi
          GOOGLE_MAPS_API_KEY per la mappa interattiva
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export function MapClient({ autoscuole }: { autoscuole: MapAutoscuola[] }) {
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleHover = useCallback((id: string) => setHoveredId(id), [])
  const handleLeave = useCallback(() => setHoveredId(null), [])

  const filtered = autoscuole.filter((a) => {
    if (selectedProvince && a.province !== selectedProvince) return false
    if (search) {
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || a.town.toLowerCase().includes(q)
    }
    return true
  })

  const provinces = ["ALL", ...PROVINCES_LAZIO.map((p) => p.code)]

  const hasGoogleMaps = !!GOOGLE_MAPS_API_KEY

  return (
    <div className="grid h-[calc(100vh)] grid-cols-[320px_1fr]">
      {/* Left panel */}
      <div className="flex flex-col border-r border-border-1 bg-surface">
        <div className="border-b border-border-1 p-4">
          <h2 className="mb-1 text-[16px] font-bold text-ink-900">Mappa territorio</h2>
          <p className="mb-3 text-[12.5px] text-ink-500">
            {filtered.length} autoscuole · Lazio
          </p>

          {/* Province filter */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {provinces.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedProvince(p === "ALL" ? null : p)}
                className="rounded-[999px] px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor:
                    (p === "ALL" && !selectedProvince) || selectedProvince === p
                      ? "#EC4899"
                      : "#F8FAFC",
                  color:
                    (p === "ALL" && !selectedProvince) || selectedProvince === p
                      ? "white"
                      : "#64748B",
                  border: `1px solid ${
                    (p === "ALL" && !selectedProvince) || selectedProvince === p
                      ? "#EC4899"
                      : "#E2E8F0"
                  }`,
                }}
              >
                {p === "ALL" ? "Tutte" : p}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca…"
              className="h-8 w-full rounded-[999px] border border-border-1 bg-surface pl-8 pr-3 text-[12.5px] outline-none placeholder:text-ink-400 focus:border-pink"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.slice(0, 40).map((a) => (
            <Link
              key={a.id}
              href={`/autoscuola/${a.id}`}
              className="flex items-center gap-3 border-b border-border-2 px-4 py-3 transition-colors hover:bg-surface-2"
              onMouseEnter={() => setHoveredId(a.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                className="h-3 w-3 rounded-full border-2 border-white"
                style={{ backgroundColor: a.stageColor, boxShadow: `0 0 0 1px ${a.stageColor}40` }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-900">
                  {a.name.replace("Autoscuola ", "")}
                </p>
                <p className="text-[11.5px] text-ink-400">
                  {a.town}, {a.province}
                </p>
              </div>
              <StageChip stageId={a.stageId} size="sm" />
            </Link>
          ))}
        </div>
      </div>

      {/* Map area */}
      {hasGoogleMaps ? (
        <div className="relative">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={{ lat: 41.9, lng: 12.7 }}
              defaultZoom={9}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="reglo-map"
              style={{ width: "100%", height: "100%" }}
            >
              {filtered.map((a) => {
                if (!a.lat || !a.lng) return null
                return (
                  <AutoscuolaMarker
                    key={a.id}
                    a={a}
                    isHovered={hoveredId === a.id}
                    onHover={handleHover}
                    onLeave={handleLeave}
                  />
                )
              })}
            </Map>
          </APIProvider>

          {/* Legend overlay */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-[14px] border border-border-1 bg-white/90 p-3 backdrop-blur-sm">
            <p className="mb-2 text-[10px] font-bold tracking-wider text-ink-400 uppercase">
              Stage
            </p>
            <div className="space-y-1">
              {STAGES.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-[10.5px] text-ink-600">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <CssFallbackMap
          filtered={filtered}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      )}
    </div>
  )
}
