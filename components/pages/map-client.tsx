"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Search } from "lucide-react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Polygon,
  useAdvancedMarkerRef,
  useMap,
} from "@vis.gl/react-google-maps"
import { STAGES, REGIONI_PROVINCE } from "@/lib/constants"
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
  salesName: string | null
  salesId: string | null
  salesColor: string | null
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

// ── Individual marker with hover InfoWindow ──────────────────────────
function AutoscuolaMarker({
  a,
  isHovered,
  onHover,
  onLeave,
  isAdmin,
}: {
  a: MapAutoscuola
  isHovered: boolean
  onHover: (id: string) => void
  onLeave: () => void
  isAdmin: boolean
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
            {isAdmin && a.salesName && (
              <p style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: 4 }}>
                Assegnata a {a.salesName}
              </p>
            )}
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
// Reverse lookup: province code → region name
const PROVINCE_TO_REGIONE: Record<string, string> = {}
for (const [regione, provs] of Object.entries(REGIONI_PROVINCE)) {
  for (const p of provs) PROVINCE_TO_REGIONE[p] = regione
}

// Convex hull (Graham scan) for territory outline
function MapControls({ bounds }: { bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null }) {
  const map = useMap()

  // Fit bounds — retry until map is truly ready
  const fitted = useRef(false)
  useEffect(() => {
    if (!map || !bounds || fitted.current) return
    const interval = setInterval(() => {
      if (!map.getDiv()?.clientHeight) return
      const b = new google.maps.LatLngBounds(
        { lat: bounds.minLat, lng: bounds.minLng },
        { lat: bounds.maxLat, lng: bounds.maxLng }
      )
      map.fitBounds(b, 40)
      fitted.current = true
      clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [map, bounds])

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
      <button
        onClick={() => map?.setZoom((map.getZoom() ?? 8) + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border-1 bg-white text-[16px] font-bold text-ink-700 shadow-sm hover:bg-surface-2"
      >
        +
      </button>
      <button
        onClick={() => map?.setZoom((map.getZoom() ?? 8) - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border-1 bg-white text-[16px] font-bold text-ink-700 shadow-sm hover:bg-surface-2"
      >
        −
      </button>
    </div>
  )
}

function convexHull(points: { lat: number; lng: number }[]): { lat: number; lng: number }[] {
  if (points.length < 3) return points
  const pts = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat)

  function cross(o: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng)
  }

  const lower: { lat: number; lng: number }[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }

  const upper: { lat: number; lng: number }[] = []
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

// Expand hull outward by a padding (in degrees ~2-3km)
function padHull(hull: { lat: number; lng: number }[], pad: number): { lat: number; lng: number }[] {
  if (hull.length < 3) return hull
  const cx = hull.reduce((s, p) => s + p.lng, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.lat, 0) / hull.length
  return hull.map((p) => {
    const dx = p.lng - cx
    const dy = p.lat - cy
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    return { lat: p.lat + (dy / d) * pad, lng: p.lng + (dx / d) * pad }
  })
}

export function MapClient({ autoscuole, isAdmin = false }: { autoscuole: MapAutoscuola[]; isAdmin?: boolean }) {
  const [selectedRegione, setSelectedRegione] = useState<string | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleHover = useCallback((id: string) => setHoveredId(id), [])
  const handleLeave = useCallback(() => setHoveredId(null), [])

  // Which regions have autoscuole
  const presentProvinces = Array.from(new Set(autoscuole.map((a) => a.province)))
  const presentRegioni = Array.from(new Set(presentProvinces.map((p) => PROVINCE_TO_REGIONE[p]).filter(Boolean))).sort()
  const isSingleRegion = presentRegioni.length === 1

  const filtered = autoscuole.filter((a) => {
    if (selectedProvince && a.province !== selectedProvince) return false
    if (!selectedProvince && selectedRegione) {
      const regionProvs = REGIONI_PROVINCE[selectedRegione] ?? []
      if (!regionProvs.includes(a.province)) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || a.town.toLowerCase().includes(q)
    }
    return true
  })

  // Province buttons for the selected (or single) region
  const visibleProvinces = isSingleRegion
    ? presentProvinces.sort()
    : selectedRegione
      ? (REGIONI_PROVINCE[selectedRegione] ?? []).filter((p) => presentProvinces.includes(p)).sort()
      : []

  // Territory polygons
  const territoryPolygons = useMemo(() => {
    if (!isAdmin) {
      // Sales: single polygon for their autoscuole
      const pts = autoscuole.filter((a) => a.lat && a.lng).map((a) => ({ lat: a.lat!, lng: a.lng! }))
      if (pts.length < 3) return []
      return [{ name: "Il tuo territorio", color: "#EC4899", hull: padHull(convexHull(pts), 0.04) }]
    }
    // Admin: one polygon per sales user
    const bySales: Record<string, { name: string; color: string; pts: { lat: number; lng: number }[] }> = {}
    for (const a of autoscuole) {
      if (!a.salesId || !a.lat || !a.lng) continue
      if (!bySales[a.salesId]) bySales[a.salesId] = { name: a.salesName!, color: a.salesColor ?? "#94A3B8", pts: [] }
      bySales[a.salesId].pts.push({ lat: a.lat, lng: a.lng })
    }
    return Object.values(bySales)
      .filter((s) => s.pts.length >= 3)
      .map((s) => ({ name: s.name, color: s.color, hull: padHull(convexHull(s.pts), 0.04) }))
  }, [autoscuole, isAdmin])

  // Map center & zoom
  // Bounds for fitBounds
  const mapBounds = useMemo(() => {
    if (isAdmin) return { minLat: 36.5, maxLat: 47.1, minLng: 6.6, maxLng: 18.5 } // All Italy
    const pts = autoscuole.filter((a) => a.lat && a.lng && a.lat > 35 && a.lat < 48 && a.lng > 6 && a.lng < 19)
    if (pts.length === 0) return null
    return {
      minLat: Math.min(...pts.map((a) => a.lat!)),
      maxLat: Math.max(...pts.map((a) => a.lat!)),
      minLng: Math.min(...pts.map((a) => a.lng!)),
      maxLng: Math.max(...pts.map((a) => a.lng!)),
    }
  }, [autoscuole, isAdmin])

  const hasGoogleMaps = !!GOOGLE_MAPS_API_KEY

  return (
    <div className="grid h-[calc(100vh)] grid-cols-[320px_1fr]">
      {/* Left panel */}
      <div className="flex flex-col border-r border-border-1 bg-surface">
        <div className="border-b border-border-1 p-4">
          <h2 className="mb-1 text-[16px] font-bold text-ink-900">Mappa territorio</h2>
          <p className="mb-3 text-[12.5px] text-ink-500">
            {filtered.length} autoscuole
          </p>

          {/* Region / Province filter */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {/* "Tutte" reset button */}
            <button
              onClick={() => { setSelectedRegione(null); setSelectedProvince(null) }}
              className="rounded-[999px] px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={{
                backgroundColor: !selectedRegione && !selectedProvince ? "#EC4899" : "#F8FAFC",
                color: !selectedRegione && !selectedProvince ? "white" : "#64748B",
                border: `1px solid ${!selectedRegione && !selectedProvince ? "#EC4899" : "#E2E8F0"}`,
              }}
            >
              Tutte
            </button>

            {/* If single region: show provinces directly */}
            {isSingleRegion ? (
              presentProvinces.sort().map((p) => (
                <button
                  key={p}
                  onClick={() => { setSelectedProvince(selectedProvince === p ? null : p); setSelectedRegione(null) }}
                  className="rounded-[999px] px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={{
                    backgroundColor: selectedProvince === p ? "#EC4899" : "#F8FAFC",
                    color: selectedProvince === p ? "white" : "#64748B",
                    border: `1px solid ${selectedProvince === p ? "#EC4899" : "#E2E8F0"}`,
                  }}
                >
                  {p}
                </button>
              ))
            ) : (
              /* Multiple regions: show region buttons */
              presentRegioni.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    if (selectedRegione === r) { setSelectedRegione(null); setSelectedProvince(null) }
                    else { setSelectedRegione(r); setSelectedProvince(null) }
                  }}
                  className="rounded-[999px] px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={{
                    backgroundColor: selectedRegione === r ? "#EC4899" : "#F8FAFC",
                    color: selectedRegione === r ? "white" : "#64748B",
                    border: `1px solid ${selectedRegione === r ? "#EC4899" : "#E2E8F0"}`,
                  }}
                >
                  {r}
                </button>
              ))
            )}
          </div>

          {/* Province sub-filter when a region is selected (multi-region mode) */}
          {!isSingleRegion && selectedRegione && visibleProvinces.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {visibleProvinces.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvince(selectedProvince === p ? null : p)}
                  className="rounded-[999px] px-2 py-0.5 text-[10.5px] font-medium transition-colors"
                  style={{
                    backgroundColor: selectedProvince === p ? "#EC489930" : "#F1F5F9",
                    color: selectedProvince === p ? "#EC4899" : "#64748B",
                    border: `1px solid ${selectedProvince === p ? "#EC4899" : "#E2E8F0"}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

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
                  {isAdmin && a.salesName && <span> · {a.salesName}</span>}
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
              defaultCenter={{ lat: 42.0, lng: 12.5 }}
              defaultZoom={6}
              gestureHandling="greedy"
              disableDefaultUI={true}
              mapId="reglo-map"
              style={{ width: "100%", height: "100%" }}
            >
              {/* Territory outlines */}
              {territoryPolygons.map((tp) => (
                <Polygon
                  key={tp.name}
                  paths={tp.hull}
                  strokeColor={tp.color}
                  strokeOpacity={0.7}
                  strokeWeight={2}
                  fillColor={tp.color}
                  fillOpacity={0.06}
                />
              ))}

              {filtered.map((a) => {
                if (!a.lat || !a.lng) return null
                return (
                  <AutoscuolaMarker
                    key={a.id}
                    a={a}
                    isHovered={hoveredId === a.id}
                    onHover={handleHover}
                    onLeave={handleLeave}
                    isAdmin={isAdmin}
                  />
                )
              })}
              <MapControls bounds={mapBounds} />
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

            {territoryPolygons.length > 0 && (
              <>
                <div className="my-2 h-px bg-border-1" />
                <p className="mb-2 text-[10px] font-bold tracking-wider text-ink-400 uppercase">
                  Territori
                </p>
                <div className="space-y-1">
                  {territoryPolygons.map((tp) => (
                    <div key={tp.name} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-4 rounded-[2px] border"
                        style={{ backgroundColor: tp.color + "20", borderColor: tp.color }}
                      />
                      <span className="text-[10.5px] text-ink-600">{tp.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
