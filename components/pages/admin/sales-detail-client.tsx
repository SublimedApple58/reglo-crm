"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, MapPin, Search, X, Plus, Globe, Filter } from "lucide-react"
import { StageChip } from "@/components/ui/stage-chip"
import { STAGES } from "@/lib/constants"
import { formatProvince } from "@/lib/utils"
import { assignRegion, unassignRegion, updateAutoscuola, bulkReassign } from "@/lib/actions/autoscuole"
import type { User } from "@/lib/db/schema"

type FilterField = "stage" | "province" | "town"
type FilterOperator = "is" | "is_not"
type FilterRule = { field: FilterField; operator: FilterOperator; values: string[]; labels: string[] }

const FILTER_FIELDS: { id: FilterField; label: string }[] = [
  { id: "stage", label: "Stage" },
  { id: "province", label: "Provincia" },
  { id: "town", label: "Città" },
]

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: "è",
  is_not: "non è",
}

type AutoscuolaRow = {
  id: string
  name: string
  town: string
  province: string
  stageId: string
  stageLabel: string
  stageColor: string
}

export function SalesDetailClient({
  sales,
  assignedRegions: initialRegions,
  allRegions,
  autoscuole: initialAutoscuole,
}: {
  sales: User
  assignedRegions: string[]
  allRegions: string[]
  autoscuole: AutoscuolaRow[]
}) {
  const [regions, setRegions] = useState(initialRegions)
  const [autoscuole, setAutoscuole] = useState(initialAutoscuole)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<FilterRule[]>([])
  const [showAddFilter, setShowAddFilter] = useState(false)
  const [editingFilterIndex, setEditingFilterIndex] = useState<number | null>(null)
  const [showAddRegion, setShowAddRegion] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const availableRegions = allRegions.filter((r) => !regions.includes(r))

  const provinces = useMemo(() => [...new Set(autoscuole.map((a) => a.province))].sort(), [autoscuole])

  const stagesInUse = useMemo(() => {
    const ids = new Set(autoscuole.map((a) => a.stageId))
    return STAGES.filter((s) => ids.has(s.id))
  }, [autoscuole])

  const filtered = useMemo(() => {
    return autoscuole.filter((a) => {
      for (const f of filters) {
        const value = f.field === "stage" ? a.stageId : f.field === "province" ? a.province : a.town
        if (f.operator === "is" && !f.values.includes(value)) return false
        if (f.operator === "is_not" && f.values.includes(value)) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return a.name.toLowerCase().includes(q) || a.town.toLowerCase().includes(q) || a.province.toLowerCase().includes(q)
      }
      return true
    })
  }, [autoscuole, search, filters])

  function addFilter(rule: FilterRule) {
    if (editingFilterIndex !== null) {
      setFilters((prev) => prev.map((f, i) => i === editingFilterIndex ? rule : f))
      setEditingFilterIndex(null)
    } else {
      setFilters((prev) => [...prev, rule])
    }
    setShowAddFilter(false)
  }

  function removeFilter(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index))
    if (editingFilterIndex === index) { setEditingFilterIndex(null); setShowAddFilter(false) }
  }

  function editFilter(index: number) {
    setEditingFilterIndex(index)
    setShowAddFilter(true)
  }

  function handleAssignRegion(region: string) {
    setRegions((prev) => [...prev, region].sort())
    setShowAddRegion(false)
    startTransition(() => {
      assignRegion(sales.id, region)
    })
  }

  function handleUnassignRegion(region: string) {
    setRegions((prev) => prev.filter((r) => r !== region))
    startTransition(() => {
      unassignRegion(sales.id, region)
    })
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
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

  function handleUnassignAutoscuola(autoscuolaId: string) {
    setAutoscuole((prev) => prev.filter((a) => a.id !== autoscuolaId))
    startTransition(() => {
      updateAutoscuola(autoscuolaId, { assignedTo: null })
    })
  }

  function handleBulkUnassign() {
    const ids = [...selected]
    setAutoscuole((prev) => prev.filter((a) => !selected.has(a.id)))
    setSelected(new Set())
    startTransition(() => {
      bulkReassign(ids, null)
    })
  }

  const initials = sales.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="mx-auto max-w-[1100px] px-8 py-6">
      {/* Back link */}
      <Link
        href="/admin/assegnazioni"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Torna alle assegnazioni
      </Link>

      {/* Sales header */}
      <div className="mb-6 flex items-center gap-4">
        {sales.avatar ? (
          <img src={sales.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[16px] font-bold text-white"
            style={{ backgroundColor: sales.color }}
          >
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink-900">{sales.name}</h1>
          <p className="flex items-center gap-1.5 text-[13px] text-ink-500">
            <MapPin className="h-3 w-3" />
            {sales.territory ?? "Nessun territorio"}
            <span className="mx-1 text-ink-300">·</span>
            {autoscuole.length} autoscuole
          </p>
        </div>
      </div>

      {/* Regions section */}
      <div className="mb-8 rounded-[18px] border border-border-1 bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
            <Globe className="h-4 w-4 text-ink-400" />
            Regioni assegnate
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowAddRegion(!showAddRegion)}
              disabled={availableRegions.length === 0}
              className="flex h-7 items-center gap-1 rounded-[999px] bg-pink px-3 text-[11px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Aggiungi regione
            </button>

            {showAddRegion && (
              <div className="absolute right-0 top-full z-50 mt-1 max-h-[300px] w-[240px] overflow-y-auto rounded-[12px] border border-border-1 bg-surface py-1 shadow-lg">
                {availableRegions.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleAssignRegion(r)}
                    className="flex w-full items-center px-3 py-2 text-left text-[13px] text-ink-700 transition-colors hover:bg-surface-2"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {regions.length === 0 ? (
          <p className="text-[13px] text-ink-400">Nessuna regione assegnata. Le autoscuole vengono assegnate manualmente.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => (
              <span
                key={region}
                className="flex items-center gap-1.5 rounded-[999px] border border-pink/20 bg-pink/5 px-3 py-1.5 text-[12.5px] font-medium text-pink"
              >
                {region}
                <button
                  onClick={() => handleUnassignRegion(region)}
                  disabled={isPending}
                  className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-pink/20"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Autoscuole section */}
      <div className="rounded-[18px] border border-border-1 bg-surface">
        <div className="border-b border-border-1 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <h2 className="mr-auto text-[14px] font-semibold text-ink-900">
              Autoscuole assegnate
              <span className="ml-2 text-[12px] font-normal text-ink-400">({filtered.length})</span>
            </h2>

            {/* Add filter button */}
            <div className="relative">
              <button
                onClick={() => setShowAddFilter(!showAddFilter)}
                className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 transition-colors hover:bg-surface-2"
              >
                <Filter className="h-3.5 w-3.5" />
                Filtro
                {filters.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pink text-[9px] font-bold text-white">
                    {filters.length}
                  </span>
                )}
              </button>
              {showAddFilter && (
                <AddFilterPopover
                  stages={stagesInUse}
                  provinces={provinces}
                  towns={[...new Set(autoscuole.map((a) => a.town))].sort()}
                  initial={editingFilterIndex !== null ? filters[editingFilterIndex] : undefined}
                  onAdd={addFilter}
                  onClose={() => { setShowAddFilter(false); setEditingFilterIndex(null) }}
                />
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca…"
                className="h-8 w-[200px] rounded-[999px] border border-border-1 bg-surface pl-8 pr-3 text-[12.5px] outline-none placeholder:text-ink-400 focus:border-pink"
              />
            </div>
          </div>

          {/* Active filter chips */}
          {filters.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {filters.map((f, i) => (
                <span
                  key={i}
                  className="flex cursor-pointer items-center gap-1.5 rounded-[999px] border border-border-1 bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-ink-700 transition-colors hover:border-pink/30 hover:bg-pink/5"
                >
                  <span onClick={() => editFilter(i)} className="flex items-center gap-1.5">
                    <span className="text-ink-400">{FILTER_FIELDS.find((ff) => ff.id === f.field)?.label}</span>
                    <span className={f.operator === "is_not" ? "text-red-500" : "text-green-600"}>{OPERATOR_LABELS[f.operator]}</span>
                    <span className="font-semibold">{f.labels.join(", ")}</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFilter(i) }}
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-700"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setFilters([])}
                className="text-[11px] font-medium text-pink hover:underline"
              >
                Resetta tutto
              </button>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-border-1 bg-ink-900 px-5 py-2.5">
            <span className="text-[12.5px] font-medium text-white">
              {selected.size} selezionat{selected.size === 1 ? "a" : "e"}
            </span>
            <button
              onClick={handleBulkUnassign}
              disabled={isPending}
              className="rounded-[999px] bg-red-500 px-4 py-1 text-[12px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              Disassegna selezionate
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-[12px] text-white/60 hover:text-white"
            >
              Annulla
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-ink-400">
            {search ? "Nessun risultato" : "Nessuna autoscuola assegnata"}
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Autoscuola</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Città</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Prov.</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Stage</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-border-2 transition-colors hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="accent-pink"
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <Link href={`/autoscuola/${a.id}`} className="text-[13px] font-semibold text-ink-900 hover:text-pink">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-[13px] text-ink-600">{a.town}</td>
                    <td className="px-5 py-2.5 text-[13px] font-medium text-ink-500">{formatProvince(a.province)}</td>
                    <td className="px-5 py-2.5">
                      <StageChip stageId={a.stageId} size="sm" />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        onClick={() => handleUnassignAutoscuola(a.id)}
                        disabled={isPending}
                        className="text-[11px] font-medium text-red-500 transition-colors hover:underline disabled:opacity-50"
                      >
                        Disassegna
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function AddFilterPopover({
  stages,
  provinces,
  towns,
  initial,
  onAdd,
  onClose,
}: {
  stages: { id: string; label: string }[]
  provinces: string[]
  towns: string[]
  initial?: FilterRule
  onAdd: (rule: FilterRule) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<"field" | "operator" | "value">(initial ? "value" : "field")
  const [field, setField] = useState<FilterField | null>(initial?.field ?? null)
  const [operator, setOperator] = useState<FilterOperator | null>(initial?.operator ?? null)
  const [valueSearch, setValueSearch] = useState("")
  const [checked, setChecked] = useState<Map<string, string>>(() => {
    if (!initial) return new Map()
    const m = new Map<string, string>()
    initial.values.forEach((v, i) => m.set(v, initial.labels[i]))
    return m
  })

  function selectField(f: FilterField) {
    setField(f)
    setStep("operator")
  }

  function selectOperator(op: FilterOperator) {
    setOperator(op)
    setStep("value")
    setValueSearch("")
    setChecked(new Map())
  }

  function toggleValue(value: string, label: string) {
    setChecked((prev) => {
      const next = new Map(prev)
      if (next.has(value)) next.delete(value); else next.set(value, label)
      return next
    })
  }

  function confirm() {
    if (!field || !operator || checked.size === 0) return
    onAdd({
      field,
      operator,
      values: [...checked.keys()],
      labels: [...checked.values()],
    })
  }

  const options: { value: string; label: string }[] = useMemo(() => {
    if (field === "stage") return stages.map((s) => ({ value: s.id, label: s.label }))
    if (field === "province") return provinces.map((p) => ({ value: p, label: formatProvince(p) }))
    if (field === "town") return towns.map((t) => ({ value: t, label: t }))
    return []
  }, [field, stages, provinces, towns])

  const filteredOptions = valueSearch
    ? options.filter((v) => v.label.toLowerCase().includes(valueSearch.toLowerCase()))
    : options

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-[280px] rounded-[12px] border border-border-1 bg-surface shadow-lg">
        {/* Step 1: Choose field */}
        {step === "field" && (
          <div className="py-1">
            <div className="px-3 py-2 text-[10.5px] font-semibold tracking-wider text-ink-400 uppercase">Filtra per</div>
            {FILTER_FIELDS.map((f) => (
              <button
                key={f.id}
                onClick={() => selectField(f.id)}
                className="flex w-full items-center px-3 py-2 text-[13px] text-ink-700 transition-colors hover:bg-surface-2"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Choose operator */}
        {step === "operator" && (
          <div className="py-1">
            <button onClick={() => { setStep("field"); setField(null) }} className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] text-ink-400 hover:text-ink-700">
              <ArrowLeft className="h-3 w-3" />
              {FILTER_FIELDS.find((f) => f.id === field)?.label}
            </button>
            <div className="my-1 h-px bg-border-1" />
            {(["is", "is_not"] as FilterOperator[]).map((op) => (
              <button
                key={op}
                onClick={() => selectOperator(op)}
                className="flex w-full items-center px-3 py-2 text-[13px] text-ink-700 transition-colors hover:bg-surface-2"
              >
                <span className={op === "is_not" ? "text-red-500" : "text-green-600"}>{OPERATOR_LABELS[op]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Multi-select values */}
        {step === "value" && (
          <div className="py-1">
            <button onClick={() => { setStep("operator"); setOperator(null); setChecked(new Map()) }} className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] text-ink-400 hover:text-ink-700">
              <ArrowLeft className="h-3 w-3" />
              {FILTER_FIELDS.find((f) => f.id === field)?.label}
              {" "}
              <span className={operator === "is_not" ? "text-red-500" : "text-green-600"}>{OPERATOR_LABELS[operator!]}</span>
            </button>
            <div className="px-2 py-1">
              <input
                value={valueSearch}
                onChange={(e) => setValueSearch(e.target.value)}
                placeholder="Cerca…"
                autoFocus
                className="h-7 w-full rounded-[6px] border border-border-1 px-2.5 text-[12px] outline-none placeholder:text-ink-400 focus:border-pink"
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {filteredOptions.map((v) => (
                <label
                  key={v.value}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-ink-700 transition-colors hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(v.value)}
                    onChange={() => toggleValue(v.value, v.label)}
                    className="accent-pink"
                  />
                  {v.label}
                </label>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-3 text-center text-[12px] text-ink-400">Nessun risultato</div>
              )}
            </div>
            {/* Confirm button */}
            <div className="border-t border-border-1 px-2 py-2">
              <button
                onClick={confirm}
                disabled={checked.size === 0}
                className="w-full rounded-[8px] bg-pink py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-40"
              >
                Applica{checked.size > 0 ? ` (${checked.size})` : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
