"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Clock,
  Building,
  X,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { StageChip } from "@/components/ui/stage-chip"
import { updateAutoscuolaStage } from "@/lib/actions/autoscuole"

type AutoscuolaFlat = {
  id: string
  name: string
  owner: string | null
  province: string
  town: string
  stageId: string
  pipelineValue: number | null
  lastContact: number | null
  stageName: string
  stageColor: string
  salesName: string | null
  assignedTo: string | null
}

type StageConfig = {
  id: string
  label: string
  color: string
  tone: string
  order: number
}

type SalesUser = {
  id: string
  name: string
}

type ActiveFilters = {
  stages: string[]
  province: string | null
  assignedTo: string | null
}

export function PipelineClient({
  autoscuole: initialAutoscuole,
  stages,
  salesUsers,
}: {
  autoscuole: AutoscuolaFlat[]
  stages: StageConfig[]
  salesUsers: SalesUser[]
}) {
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [search, setSearch] = useState("")
  const [autoscuole, setAutoscuole] = useState(initialAutoscuole)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ActiveFilters>({
    stages: [],
    province: null,
    assignedTo: null,
  })

  // Unique provinces
  const provinces = useMemo(() => {
    const set = new Set(autoscuole.map((a) => a.province))
    return Array.from(set).sort()
  }, [autoscuole])

  const hasActiveFilters = filters.stages.length > 0 || filters.province !== null || filters.assignedTo !== null

  const filtered = autoscuole.filter((a) => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !a.name.toLowerCase().includes(q) &&
        !a.town.toLowerCase().includes(q) &&
        !a.province.toLowerCase().includes(q)
      )
        return false
    }
    if (filters.stages.length > 0 && !filters.stages.includes(a.stageId)) return false
    if (filters.province && a.province !== filters.province) return false
    if (filters.assignedTo !== null) {
      if (filters.assignedTo === "__unassigned__") {
        if (a.assignedTo !== null) return false
      } else {
        if (a.assignedTo !== filters.assignedTo) return false
      }
    }
    return true
  })

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return
      const { draggableId, destination } = result
      const newStageId = destination.droppableId

      setAutoscuole((prev) =>
        prev.map((a) =>
          a.id === draggableId
            ? {
                ...a,
                stageId: newStageId,
                stageName: stages.find((s) => s.id === newStageId)?.label ?? a.stageName,
                stageColor: stages.find((s) => s.id === newStageId)?.color ?? a.stageColor,
              }
            : a
        )
      )

      await updateAutoscuolaStage(draggableId, newStageId)
    },
    [stages]
  )

  function toggleStageFilter(stageId: string) {
    setFilters((f) => ({
      ...f,
      stages: f.stages.includes(stageId)
        ? f.stages.filter((s) => s !== stageId)
        : [...f.stages, stageId],
    }))
  }

  function clearFilters() {
    setFilters({ stages: [], province: null, assignedTo: null })
  }

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 border-b border-border-1 px-4 py-3">
        <div className="flex rounded-[8px] border border-border-1 p-0.5">
          <button
            onClick={() => setView("kanban")}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
            style={{
              backgroundColor: view === "kanban" ? "#FDF2F8" : "transparent",
              color: view === "kanban" ? "#EC4899" : "#64748B",
            }}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("list")}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
            style={{
              backgroundColor: view === "list" ? "#FDF2F8" : "transparent",
              color: view === "list" ? "#EC4899" : "#64748B",
            }}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca autoscuola…"
            className="h-8 w-[220px] rounded-[999px] border border-border-1 bg-surface pl-8 pr-3 text-[12.5px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex h-8 items-center gap-1.5 rounded-[999px] border px-3 text-[12px] font-medium transition-colors"
            style={{
              borderColor: hasActiveFilters ? "#EC4899" : undefined,
              color: hasActiveFilters ? "#EC4899" : "#475569",
              backgroundColor: hasActiveFilters ? "#FDF2F8" : undefined,
            }}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtri
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pink text-[9px] font-bold text-white">
                {filters.stages.length + (filters.province ? 1 : 0) + (filters.assignedTo !== null ? 1 : 0)}
              </span>
            )}
          </button>

          {showFilters && (
            <FilterPopover
              stages={stages}
              provinces={provinces}
              salesUsers={salesUsers}
              filters={filters}
              onToggleStage={toggleStageFilter}
              onSetProvince={(p) => setFilters((f) => ({ ...f, province: p }))}
              onSetAssignedTo={(a) => setFilters((f) => ({ ...f, assignedTo: a }))}
              onClose={() => setShowFilters(false)}
            />
          )}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5">
            {filters.stages.map((sid) => {
              const stage = stages.find((s) => s.id === sid)
              return (
                <span
                  key={sid}
                  className="flex items-center gap-1 rounded-[999px] px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: (stage?.color ?? "#64748B") + "15", color: stage?.color }}
                >
                  {stage?.label}
                  <button onClick={() => toggleStageFilter(sid)}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )
            })}
            {filters.province && (
              <span className="flex items-center gap-1 rounded-[999px] bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                {filters.province}
                <button onClick={() => setFilters((f) => ({ ...f, province: null }))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {filters.assignedTo !== null && (
              <span className="flex items-center gap-1 rounded-[999px] bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                {filters.assignedTo === "__unassigned__"
                  ? "Non assegnate"
                  : salesUsers.find((u) => u.id === filters.assignedTo)?.name ?? "Sales"}
                <button onClick={() => setFilters((f) => ({ ...f, assignedTo: null }))}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-1 text-[11px] font-medium text-pink hover:underline"
            >
              Resetta
            </button>
          </div>
        )}

        <div className="ml-auto text-[12px] font-medium text-ink-400">
          {filtered.length} autoscuole
        </div>
      </div>

      {/* Content */}
      {view === "kanban" ? (
        <KanbanView autoscuole={filtered} stages={stages} onDragEnd={handleDragEnd} />
      ) : (
        <ListView autoscuole={filtered} />
      )}
    </div>
  )
}

function FilterPopover({
  stages,
  provinces,
  salesUsers,
  filters,
  onToggleStage,
  onSetProvince,
  onSetAssignedTo,
  onClose,
}: {
  stages: StageConfig[]
  provinces: string[]
  salesUsers: SalesUser[]
  filters: ActiveFilters
  onToggleStage: (stageId: string) => void
  onSetProvince: (p: string | null) => void
  onSetAssignedTo: (a: string | null) => void
  onClose: () => void
}) {
  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-[14px] border border-border-1 bg-surface p-4 shadow-lg">
      {/* Stage filters */}
      <div className="mb-4">
        <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Stage</h4>
        <div className="flex flex-wrap gap-1.5">
          {stages.map((stage) => {
            const isActive = filters.stages.includes(stage.id)
            return (
              <button
                key={stage.id}
                onClick={() => onToggleStage(stage.id)}
                className="rounded-[999px] px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  backgroundColor: isActive ? stage.color : "#F8FAFC",
                  color: isActive ? "white" : "#64748B",
                }}
              >
                {stage.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Province filter */}
      <div className="mb-4">
        <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Provincia</h4>
        <select
          value={filters.province ?? ""}
          onChange={(e) => onSetProvince(e.target.value || null)}
          className="h-8 w-full rounded-[8px] border border-border-1 px-2 text-[12px] text-ink-700 outline-none focus:border-pink"
        >
          <option value="">Tutte</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Sales filter */}
      <div className="mb-4">
        <h4 className="mb-2 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Sales</h4>
        <select
          value={filters.assignedTo ?? ""}
          onChange={(e) => onSetAssignedTo(e.target.value || null)}
          className="h-8 w-full rounded-[8px] border border-border-1 px-2 text-[12px] text-ink-700 outline-none focus:border-pink"
        >
          <option value="">Tutti</option>
          <option value="__unassigned__">Non assegnate</option>
          {salesUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-[999px] bg-surface-2 py-1.5 text-[12px] font-medium text-ink-600 hover:bg-border-1"
      >
        Chiudi
      </button>
    </div>
  )
}

function KanbanView({
  autoscuole,
  stages,
  onDragEnd,
}: {
  autoscuole: AutoscuolaFlat[]
  stages: StageConfig[]
  onDragEnd: (result: DropResult) => void
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-1 gap-3.5 overflow-x-auto bg-surface-2 p-4">
        {stages.map((stage) => {
          const items = autoscuole.filter((a) => a.stageId === stage.id)
          return (
            <div key={stage.id} className="flex w-[292px] shrink-0 flex-col">
              {/* Column header */}
              <div
                className="flex items-center gap-2 rounded-t-[18px] px-3.5 py-2.5"
                style={{
                  backgroundColor: stage.color + "12",
                  border: `1px solid ${stage.color}28`,
                  borderBottom: "none",
                }}
              >
                <span
                  className="inline-block h-[6px] w-[6px] rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span
                  className="flex-1 text-[12px] font-semibold"
                  style={{ color: stage.color }}
                >
                  {stage.label}
                </span>
                <span
                  className="rounded-full bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold"
                  style={{ color: stage.color }}
                >
                  {items.length}
                </span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-b-[14px] p-2.5 transition-colors"
                    style={{
                      backgroundColor: snapshot.isDraggingOver
                        ? stage.color + "10"
                        : stage.color + "06",
                      border: snapshot.isDraggingOver
                        ? `2px dashed ${stage.color}80`
                        : "2px dashed transparent",
                      minHeight: 100,
                    }}
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <Link
                            href={`/autoscuola/${item.id}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="rounded-[14px] border bg-white transition-all"
                            style={{
                              ...provided.draggableProps.style,
                              borderLeft: `4px solid ${stage.color}`,
                              borderColor: `#E2E8F0`,
                              borderLeftColor: stage.color,
                              padding: "12px 14px",
                              transform: snapshot.isDragging
                                ? provided.draggableProps.style?.transform
                                : provided.draggableProps.style?.transform,
                              boxShadow: snapshot.isDragging
                                ? "0 4px 14px rgba(15,23,42,0.12)"
                                : undefined,
                            }}
                          >
                            <p className="mb-1 text-[13px] font-semibold leading-tight text-ink-900">
                              {item.name.replace("Autoscuola ", "")}
                            </p>
                            <p className="mb-2 flex items-center gap-[5px] text-[11.5px] text-ink-500">
                              <Building className="h-3 w-3" />
                              {item.town}, {item.province}
                            </p>
                            <div className="flex items-center justify-between">
                              {item.pipelineValue ? (
                                <span
                                  className="rounded-[999px] px-2 py-0.5 font-mono text-[10.5px] font-semibold"
                                  style={{
                                    color: stage.color,
                                    backgroundColor: stage.color + "15",
                                  }}
                                >
                                  €{item.pipelineValue.toLocaleString("it-IT")}
                                </span>
                              ) : (
                                <span />
                              )}
                              {item.lastContact !== null && (
                                <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
                                  <Clock className="h-3 w-3" />
                                  {item.lastContact}g
                                </span>
                              )}
                            </div>
                          </Link>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}

function ListView({ autoscuole }: { autoscuole: AutoscuolaFlat[] }) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-1">
            <th className="px-3 py-2.5 text-left text-[11.5px] font-semibold text-ink-400 uppercase">
              Autoscuola
            </th>
            <th className="px-3 py-2.5 text-left text-[11.5px] font-semibold text-ink-400 uppercase">
              Città
            </th>
            <th className="px-3 py-2.5 text-left text-[11.5px] font-semibold text-ink-400 uppercase">
              Prov.
            </th>
            <th className="px-3 py-2.5 text-left text-[11.5px] font-semibold text-ink-400 uppercase">
              Stage
            </th>
            <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-ink-400 uppercase">
              Valore
            </th>
            <th className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-ink-400 uppercase">
              Ultimo contatto
            </th>
          </tr>
        </thead>
        <tbody>
          {autoscuole.slice(0, 100).map((a) => (
            <tr key={a.id} className="border-b border-border-2 transition-colors hover:bg-surface-2">
              <td className="px-3 py-2.5">
                <Link href={`/autoscuola/${a.id}`} className="text-[13px] font-semibold text-ink-900 hover:text-pink">
                  {a.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-[13px] text-ink-600">{a.town}</td>
              <td className="px-3 py-2.5 text-[13px] font-medium text-ink-500">{a.province}</td>
              <td className="px-3 py-2.5">
                <StageChip stageId={a.stageId} size="sm" />
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-[13px] font-medium text-ink-900">
                {a.pipelineValue ? `€${a.pipelineValue.toLocaleString("it-IT")}` : "–"}
              </td>
              <td className="px-3 py-2.5 text-right text-[13px] text-ink-500">
                {a.lastContact !== null ? `${a.lastContact}g fa` : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
