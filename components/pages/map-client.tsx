"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Search } from "lucide-react"
import Supercluster from "supercluster"
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
import { formatProvince } from "@/lib/utils"
import { StageChip } from "@/components/ui/stage-chip"
import regionBoundaries from "@/lib/region-boundaries.json"

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
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: a.stageColor,
            border: "2.5px solid white",
            boxShadow: isHovered
              ? `0 0 0 3px ${a.stageColor}50, 0 0 10px ${a.stageColor}60`
              : `0 0 0 1px ${a.stageColor}40, 0 1px 4px rgba(0,0,0,0.25)`,
            transform: isHovered ? "scale(1.4)" : "scale(1)",
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
              {a.town}, {formatProvince(a.province)}
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

// ── Cluster marker ──────────────────────────────────────────────────
function ClusterMarker({
  lat,
  lng,
  count,
  color,
}: {
  lat: number
  lng: number
  count: number
  color: string
}) {
  const map = useMap()
  const size = Math.min(48, 24 + Math.sqrt(count) * 4)
  return (
    <AdvancedMarker
      position={{ lat, lng }}
      zIndex={5}
      onClick={() => {
        map?.panTo({ lat, lng })
        map?.setZoom((map.getZoom() ?? 8) + 2)
      }}
      style={{ cursor: "pointer" }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          border: "3px solid white",
          boxShadow: `0 2px 8px ${color}60`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: count > 99 ? "10px" : "11px",
          fontWeight: 700,
          color: "white",
        }}
      >
        {count}
      </div>
    </AdvancedMarker>
  )
}

// ── Clustered markers container ─────────────────────────────────────
function ClusteredMarkers({
  items,
  hoveredId,
  onHover,
  onLeave,
  isAdmin,
}: {
  items: MapAutoscuola[]
  hoveredId: string | null
  onHover: (id: string) => void
  onLeave: () => void
  isAdmin: boolean
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(6)
  const [bounds, setBounds] = useState<[number, number, number, number]>([-180, -85, 180, 85])

  // Track zoom and bounds changes
  useEffect(() => {
    if (!map) return
    const listener = map.addListener("idle", () => {
      const z = map.getZoom()
      if (z != null) setZoom(Math.round(z))
      const b = map.getBounds()
      if (b) {
        setBounds([
          b.getSouthWest()!.lng(),
          b.getSouthWest()!.lat(),
          b.getNorthEast()!.lng(),
          b.getNorthEast()!.lat(),
        ])
      }
    })
    return () => listener.remove()
  }, [map])

  // Build supercluster index
  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string; stageColor: string }>({
      radius: 30,
      maxZoom: 12,
    })
    const points: Supercluster.PointFeature<{ id: string; stageColor: string }>[] = items
      .filter((a) => a.lat && a.lng)
      .map((a) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [a.lng!, a.lat!] },
        properties: { id: a.id, stageColor: a.stageColor },
      }))
    sc.load(points)
    return sc
  }, [items])

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    return index.getClusters(bounds, zoom)
  }, [index, bounds, zoom])

  // Build a lookup for quick access
  const itemById = useMemo(() => {
    const lookup: Record<string, MapAutoscuola> = {}
    for (const a of items) lookup[a.id] = a
    return lookup
  }, [items])

  return (
    <>
      {clusters.map((cluster) => {
        const [lng, lat] = cluster.geometry.coordinates
        const props = cluster.properties as Record<string, unknown>

        if (props.cluster) {
          // Determine dominant color in cluster
          const leaves = index.getLeaves(props.cluster_id as number, Infinity)
          const colorCounts: Record<string, number> = {}
          for (const leaf of leaves) {
            const c = leaf.properties.stageColor
            colorCounts[c] = (colorCounts[c] ?? 0) + 1
          }
          const dominantColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#EC4899"

          return (
            <ClusterMarker
              key={`cluster-${props.cluster_id}`}
              lat={lat}
              lng={lng}
              count={props.point_count as number}
              color={dominantColor}
            />
          )
        }

        // Individual marker
        const a = itemById[props.id as string]
        if (!a) return null
        return (
          <AutoscuolaMarker
            key={a.id}
            a={a}
            isHovered={hoveredId === a.id}
            onHover={onHover}
            onLeave={onLeave}
            isAdmin={isAdmin}
          />
        )
      })}
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
                    {a.town}, {formatProvince(a.province)}
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
      // Use panTo + setZoom instead of fitBounds to avoid google.maps type issue
      const centerLat = (bounds.minLat + bounds.maxLat) / 2
      const centerLng = (bounds.minLng + bounds.maxLng) / 2
      const span = Math.max(bounds.maxLat - bounds.minLat, bounds.maxLng - bounds.minLng)
      let zoom = 12
      if (span > 4) zoom = 7
      else if (span > 2) zoom = 8
      else if (span > 1) zoom = 9
      else if (span > 0.5) zoom = 10
      else if (span > 0.2) zoom = 11
      map.panTo({ lat: centerLat, lng: centerLng })
      map.setZoom(zoom)
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
  if (hull.length === 0) return hull
  if (hull.length < 3) {
    // For 1-2 points, create a small circle/diamond around them
    const cx = hull.reduce((s, p) => s + p.lng, 0) / hull.length
    const cy = hull.reduce((s, p) => s + p.lat, 0) / hull.length
    return [
      { lat: cy + pad, lng: cx },
      { lat: cy, lng: cx + pad },
      { lat: cy - pad, lng: cx },
      { lat: cy, lng: cx - pad },
    ]
  }
  const cx = hull.reduce((s, p) => s + p.lng, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.lat, 0) / hull.length
  return hull.map((p) => {
    const dx = p.lng - cx
    const dy = p.lat - cy
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    return { lat: p.lat + (dy / d) * pad, lng: p.lng + (dx / d) * pad }
  })
}

type SalesTerritoryEntry = { userId: string; region: string; salesName: string; salesColor: string }

export function MapClient({ autoscuole, isAdmin = false, salesTerritories = [] }: { autoscuole: MapAutoscuola[]; isAdmin?: boolean; salesTerritories?: SalesTerritoryEntry[] }) {
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

  // Territory polygons — based on where autoscuole are, using real region boundaries
  const territoryPolygons = useMemo(() => {
    const boundaries = regionBoundaries as Record<string, { lat: number; lng: number }[][]>

    if (!isAdmin) {
      const regionSet = new Set<string>()
      for (const a of autoscuole) {
        const region = PROVINCE_TO_REGIONE[a.province]
        if (region) regionSet.add(region)
      }
      return [...regionSet].map((region) => ({
        name: region,
        color: "#EC4899",
        paths: boundaries[region] ?? [],
      })).filter((t) => t.paths.length > 0)
    }

    // Admin: one region per sales, based on their actual autoscuole
    const salesRegions: Record<string, { name: string; color: string; regions: Set<string> }> = {}
    for (const a of autoscuole) {
      if (!a.salesId) continue
      const region = PROVINCE_TO_REGIONE[a.province]
      if (!region) continue
      if (!salesRegions[a.salesId]) salesRegions[a.salesId] = { name: a.salesName!, color: a.salesColor ?? "#94A3B8", regions: new Set() }
      salesRegions[a.salesId].regions.add(region)
    }

    return Object.values(salesRegions).flatMap((s) =>
      [...s.regions].map((region) => ({
        name: `${s.name} — ${region}`,
        color: s.color,
        paths: boundaries[region] ?? [],
      })).filter((t) => t.paths.length > 0)
    )
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
    <div className="grid h-screen grid-cols-[320px_1fr] overflow-hidden">
      {/* Left panel */}
      <div className="flex min-h-0 flex-col border-r border-border-1 bg-surface">
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
                  {a.town}, {formatProvince(a.province)}
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
              {territoryPolygons.map((tp) =>
                tp.paths.map((ring, i) => (
                  <Polygon
                    key={`${tp.name}-${i}`}
                    paths={ring}
                    strokeColor={tp.color}
                    strokeOpacity={0.8}
                    strokeWeight={2}
                    fillColor={tp.color}
                    fillOpacity={0.08}
                    zIndex={10}
                  />
                ))
              )}

              <ClusteredMarkers
                items={filtered}
                hoveredId={hoveredId}
                onHover={handleHover}
                onLeave={handleLeave}
                isAdmin={isAdmin}
              />
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
                  {territoryPolygons
                    .filter((tp, i, arr) => arr.findIndex((t) => t.name.split(" — ")[0] === tp.name.split(" — ")[0]) === i)
                    .map((tp) => (
                      <div key={tp.name} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-4 rounded-[2px] border"
                          style={{ backgroundColor: tp.color + "20", borderColor: tp.color }}
                        />
                        <span className="text-[10.5px] text-ink-600">{tp.name.split(" — ")[0]}</span>
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
