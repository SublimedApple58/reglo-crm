"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { Search, AlertCircle, Check, MapPin } from "lucide-react"
import { StageChip } from "@/components/ui/stage-chip"
import { REGIONI_PROVINCE } from "@/lib/constants"
import { formatProvince } from "@/lib/utils"
import { updateAutoscuola, bulkReassign, assignRegion } from "@/lib/actions/autoscuole"

type AutoscuolaRow = {
  id: string
  name: string
  province: string
  town: string
  stageId: string
  assignedTo: string | null
  salesName: string | null
}

type SalesOption = {
  id: string
  name: string
  territory: string
  color: string
  count: number
}

export function AssegnazioniClient({
  autoscuole: initial,
  salesOptions,
}: {
  autoscuole: AutoscuolaRow[]
  salesOptions: SalesOption[]
}) {
  const [autoscuole, setAutoscuole] = useState(initial)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [filterProvince, setFilterProvince] = useState<string | null>(null)
  const [filterAssignment, setFilterAssignment] = useState<string | null>(null) // "unassigned" | salesId | null
  const [bulkTarget, setBulkTarget] = useState("")
  const [isPending, startTransition] = useTransition()
  const [showTerritoryAssign, setShowTerritoryAssign] = useState(false)
  const [territoryMode, setTerritoryMode] = useState<"regione" | "provincia">("regione")
  const [territoryTarget, setTerritoryTarget] = useState("")
  const [territorySales, setTerritorySales] = useState("")

  const unassignedCount = autoscuole.filter((a) => !a.assignedTo).length
  const provinces = useMemo(() => [...new Set(autoscuole.map((a) => a.province))].sort(), [autoscuole])

  const filtered = autoscuole.filter((a) => {
    if (filterProvince && a.province !== filterProvince) return false
    if (filterAssignment === "unassigned" && a.assignedTo !== null) return false
    if (filterAssignment && filterAssignment !== "unassigned" && a.assignedTo !== filterAssignment) return false
    if (search) {
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || a.town.toLowerCase().includes(q)
    }
    return true
  })

  // Limit displayed rows for performance
  const displayed = filtered.slice(0, 200)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === displayed.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(displayed.map((a) => a.id)))
    }
  }

  function handleAssign(autoscuolaId: string, salesId: string | null) {
    const salesName = salesOptions.find((s) => s.id === salesId)?.name ?? null
    setAutoscuole((prev) =>
      prev.map((a) =>
        a.id === autoscuolaId ? { ...a, assignedTo: salesId, salesName } : a
      )
    )
    startTransition(() => {
      updateAutoscuola(autoscuolaId, { assignedTo: salesId })
    })
  }

  function handleBulkAssign() {
    if (!bulkTarget || selected.size === 0) return
    const target = bulkTarget === "none" ? null : bulkTarget
    const salesName = salesOptions.find((s) => s.id === target)?.name ?? null
    setAutoscuole((prev) =>
      prev.map((a) =>
        selected.has(a.id) ? { ...a, assignedTo: target, salesName } : a
      )
    )
    startTransition(() => {
      bulkReassign([...selected], target)
    })
    setSelected(new Set())
    setBulkTarget("")
  }

  function handleTerritoryAssign() {
    if (!territoryTarget || !territorySales) return
    let matchingProvinces: string[]
    if (territoryMode === "regione") {
      matchingProvinces = REGIONI_PROVINCE[territoryTarget] ?? []
    } else {
      matchingProvinces = [territoryTarget]
    }
    const ids = autoscuole
      .filter((a) => matchingProvinces.includes(a.province) && !a.assignedTo)
      .map((a) => a.id)
    const salesName = salesOptions.find((s) => s.id === territorySales)?.name ?? null
    if (ids.length > 0) {
      setAutoscuole((prev) =>
        prev.map((a) =>
          ids.includes(a.id) ? { ...a, assignedTo: territorySales, salesName } : a
        )
      )
    }
    startTransition(async () => {
      // Assign the region to the sales (persistent territory)
      if (territoryMode === "regione") {
        await assignRegion(territorySales, territoryTarget)
      } else {
        // Province-level: just bulk reassign
        if (ids.length > 0) await bulkReassign(ids, territorySales)
      }
    })
    setShowTerritoryAssign(false)
    setTerritoryTarget("")
    setTerritorySales("")
  }

  // Count unassigned for a set of provinces
  function countUnassignedForProvinces(provs: string[]) {
    return autoscuole.filter((a) => provs.includes(a.province) && !a.assignedTo).length
  }
  function countTotalForProvinces(provs: string[]) {
    return autoscuole.filter((a) => provs.includes(a.province)).length
  }

  // Province stats
  const provinceStats = useMemo(() => {
    const map = new Map<string, { total: number; unassigned: number }>()
    for (const a of autoscuole) {
      const stat = map.get(a.province) ?? { total: 0, unassigned: 0 }
      stat.total++
      if (!a.assignedTo) stat.unassigned++
      map.set(a.province, stat)
    }
    return map
  }, [autoscuole])

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[22px] font-bold tracking-tight text-ink-900">Assegnazioni</h1>
        <span
          className="flex items-center gap-1 rounded-[999px] px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            backgroundColor: unassignedCount > 0 ? "#FEF2F2" : "#ECFDF5",
            color: unassignedCount > 0 ? "#EF4444" : "#10B981",
          }}
        >
          {unassignedCount > 0 ? (
            <>
              <AlertCircle className="h-3 w-3" />
              {unassignedCount} non assegnate
            </>
          ) : (
            <>
              <Check className="h-3 w-3" />
              Tutte assegnate
            </>
          )}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowTerritoryAssign(true)}
          className="flex h-8 items-center gap-1.5 rounded-[999px] bg-pink px-4 text-[12.5px] font-semibold text-white hover:bg-pink/90"
        >
          <MapPin className="h-3.5 w-3.5" />
          Assegna per territorio
        </button>
      </div>

      {/* Sales summary strip */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {salesOptions.map((s) => (
          <Link
            key={s.id}
            href={`/admin/assegnazioni/${s.id}`}
            className="w-[180px] shrink-0 cursor-pointer rounded-[12px] border border-border-1 bg-surface p-3 transition-all hover:-translate-y-px hover:border-pink/30 hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: s.color }}
              >
                {s.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <span className="truncate text-[12px] font-semibold text-ink-900">{s.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-400">
              <span>{s.territory}</span>
              <span className="font-mono font-semibold text-ink-600">{s.count}</span>
            </div>
          </Link>
        ))}
        {unassignedCount > 0 && (
          <div className="w-[180px] shrink-0 rounded-[12px] border-2 border-dashed border-red/30 bg-red-50 p-3">
            <p className="text-[12px] font-semibold text-red">Non assegnate</p>
            <p className="font-mono text-[18px] font-bold text-red">{unassignedCount}</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca…"
            className="h-8 w-[220px] rounded-[999px] border border-border-1 pl-8 pr-3 text-[12.5px] outline-none placeholder:text-ink-400 focus:border-pink"
          />
        </div>
        <select
          value={filterProvince ?? ""}
          onChange={(e) => setFilterProvince(e.target.value || null)}
          className="h-8 rounded-[999px] border border-border-1 bg-surface px-3 text-[12px] text-ink-600 outline-none"
        >
          <option value="">Tutte le province</option>
          {provinces.map((p) => {
            const stat = provinceStats.get(p)
            return (
              <option key={p} value={p}>
                {formatProvince(p)} ({stat?.total ?? 0} · {stat?.unassigned ?? 0} libere)
              </option>
            )
          })}
        </select>
        <select
          value={filterAssignment ?? ""}
          onChange={(e) => setFilterAssignment(e.target.value || null)}
          className="h-8 rounded-[999px] border border-border-1 bg-surface px-3 text-[12px] text-ink-600 outline-none"
        >
          <option value="">Tutti</option>
          <option value="unassigned">Solo non assegnate</option>
          {salesOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <span className="ml-auto text-[12px] text-ink-400">
          {filtered.length} risultati{filtered.length > 200 ? " (prime 200)" : ""}
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-[12px] bg-ink-900 px-4 py-2.5">
          <span className="text-[12.5px] font-medium text-white">
            {selected.size} selezionate
          </span>
          <select
            value={bulkTarget}
            onChange={(e) => setBulkTarget(e.target.value)}
            className="h-7 rounded-[8px] bg-white/10 px-3 text-[12px] text-white outline-none"
          >
            <option value="">Assegna a…</option>
            {salesOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="none">Rimuovi assegnazione</option>
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={!bulkTarget || isPending}
            className="rounded-[999px] bg-pink px-4 py-1 text-[12px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
          >
            Applica
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-[18px] border border-border-1 bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-1">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === displayed.length && displayed.length > 0}
                  onChange={toggleAll}
                  className="accent-pink"
                />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Autoscuola
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Città
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Prov.
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Assegnata a
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((a) => (
              <tr
                key={a.id}
                className="border-b border-border-2 transition-colors hover:bg-surface-2"
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggleSelect(a.id)}
                    className="accent-pink"
                  />
                </td>
                <td className="px-4 py-2.5 text-[13px] font-semibold text-ink-900">{a.name}</td>
                <td className="px-4 py-2.5 text-[13px] text-ink-600">{a.town}</td>
                <td className="px-4 py-2.5 text-[13px] font-medium text-ink-500">{formatProvince(a.province)}</td>
                <td className="px-4 py-2.5">
                  <StageChip stageId={a.stageId} size="sm" />
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={a.assignedTo ?? ""}
                    onChange={(e) =>
                      handleAssign(a.id, e.target.value || null)
                    }
                    className="h-7 rounded-[8px] border border-border-1 bg-surface px-2 text-[12px] text-ink-700 outline-none"
                  >
                    <option value="">Non assegnata</option>
                    {salesOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Territory assign dialog */}
      {showTerritoryAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTerritoryAssign(false)}>
          <div className="w-[480px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-[18px] font-bold text-ink-900">Assegna per territorio</h2>
            <p className="mb-5 text-[13px] text-ink-500">
              Assegna tutte le autoscuole non assegnate di una regione o provincia a un sales.
            </p>

            <div className="space-y-3.5">
              {/* Mode toggle */}
              <div className="flex rounded-[8px] border border-border-1 p-0.5">
                <button
                  onClick={() => { setTerritoryMode("regione"); setTerritoryTarget("") }}
                  className="flex-1 rounded-[6px] py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    backgroundColor: territoryMode === "regione" ? "#FDF2F8" : "transparent",
                    color: territoryMode === "regione" ? "#EC4899" : "#64748B",
                  }}
                >
                  Regione
                </button>
                <button
                  onClick={() => { setTerritoryMode("provincia"); setTerritoryTarget("") }}
                  className="flex-1 rounded-[6px] py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    backgroundColor: territoryMode === "provincia" ? "#FDF2F8" : "transparent",
                    color: territoryMode === "provincia" ? "#EC4899" : "#64748B",
                  }}
                >
                  Provincia
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">
                  {territoryMode === "regione" ? "Regione" : "Provincia"}
                </label>
                <select
                  value={territoryTarget}
                  onChange={(e) => setTerritoryTarget(e.target.value)}
                  className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
                >
                  <option value="">Seleziona {territoryMode}…</option>
                  {territoryMode === "regione"
                    ? Object.keys(REGIONI_PROVINCE).sort().map((r) => {
                        const provs = REGIONI_PROVINCE[r]
                        const unassigned = countUnassignedForProvinces(provs)
                        const total = countTotalForProvinces(provs)
                        return (
                          <option key={r} value={r}>
                            {r} — {unassigned} libere su {total}
                          </option>
                        )
                      })
                    : provinces.map((p) => {
                        const stat = provinceStats.get(p)
                        return (
                          <option key={p} value={p}>
                            {p} — {stat?.unassigned ?? 0} libere su {stat?.total ?? 0}
                          </option>
                        )
                      })
                  }
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Assegna a</label>
                <select
                  value={territorySales}
                  onChange={(e) => setTerritorySales(e.target.value)}
                  className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
                >
                  <option value="">Seleziona sales…</option>
                  {salesOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.territory})</option>
                  ))}
                </select>
              </div>

              {territoryTarget && (
                <div className="rounded-[10px] bg-surface-2 px-3 py-2 text-[12.5px] text-ink-600">
                  Verranno assegnate{" "}
                  <strong>
                    {territoryMode === "regione"
                      ? countUnassignedForProvinces(REGIONI_PROVINCE[territoryTarget] ?? [])
                      : provinceStats.get(territoryTarget)?.unassigned ?? 0}
                  </strong>{" "}
                  autoscuole {territoryMode === "regione" ? `della regione ${territoryTarget}` : `della provincia ${territoryTarget}`}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowTerritoryAssign(false)}
                className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
              >
                Annulla
              </button>
              <button
                onClick={handleTerritoryAssign}
                disabled={!territoryTarget || !territorySales || isPending}
                className="h-9 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
              >
                {isPending ? "Assegnazione..." : "Assegna"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
