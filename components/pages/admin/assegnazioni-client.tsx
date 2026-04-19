"use client"

import { useState, useTransition } from "react"
import { Search, AlertCircle, Check } from "lucide-react"
import { StageChip } from "@/components/ui/stage-chip"
import { updateAutoscuola, bulkReassign } from "@/lib/actions/autoscuole"

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
  const [bulkTarget, setBulkTarget] = useState("")
  const [isPending, startTransition] = useTransition()

  const unassignedCount = autoscuole.filter((a) => !a.assignedTo).length

  const filtered = autoscuole.filter((a) => {
    if (filterProvince && a.province !== filterProvince) return false
    if (search) {
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || a.town.toLowerCase().includes(q)
    }
    return true
  })

  const provinces = [...new Set(autoscuole.map((a) => a.province))].sort()

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((a) => a.id)))
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
      </div>

      {/* Sales summary strip */}
      <div className="mb-5 grid auto-cols-[180px] grid-flow-col gap-2 overflow-x-auto">
        {salesOptions.map((s) => (
          <div
            key={s.id}
            className="rounded-[12px] border border-border-1 bg-surface p-3"
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
          </div>
        ))}
        {/* Unassigned card */}
        {unassignedCount > 0 && (
          <div className="rounded-[12px] border-2 border-dashed border-red/30 bg-red-50 p-3">
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
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <span className="ml-auto text-[12px] text-ink-400">
          {filtered.length} risultati
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
                  checked={selected.size === filtered.length && filtered.length > 0}
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
            {filtered.map((a) => (
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
                <td className="px-4 py-2.5 text-[13px] font-medium text-ink-500">{a.province}</td>
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
    </div>
  )
}
