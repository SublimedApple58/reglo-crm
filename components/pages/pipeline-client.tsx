"use client"

import { useState, useCallback, useMemo, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  Clock,
  X,
  Plus,
  Users,
  Phone,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { createAutoscuola } from "@/lib/actions/autoscuole"
import { STAGES, SALES_COLORS } from "@/lib/constants"
import { formatProvince } from "@/lib/utils"
import { updateAutoscuolaStage } from "@/lib/actions/autoscuole"

type AutoscuolaFlat = {
  id: string
  name: string
  owner: string | null
  province: string
  town: string
  phone: string | null
  email: string | null
  stageId: string
  pipelineValue: number | null
  lastContact: number | null
  followUpAt: Date | null
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
  isAdmin = false,
}: {
  autoscuole: AutoscuolaFlat[]
  stages: StageConfig[]
  salesUsers: SalesUser[]
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [autoscuole, setAutoscuole] = useState(initialAutoscuole)
  const [showFilters, setShowFilters] = useState(false)
  const [newOppStage, setNewOppStage] = useState<string | null>(null)
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
    <div className="flex h-screen max-w-full flex-col">
      {/* Toolbar */}
      <div className="relative z-20 flex shrink-0 items-center gap-2.5 border-b border-border-1 bg-surface px-4 py-3">
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

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] font-medium text-ink-400">
            {filtered.length} autoscuole
          </span>
          <button
            onClick={() => setNewOppStage("da_chiamare")}
            className="flex h-8 items-center gap-1.5 rounded-[999px] bg-pink px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-pink/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuova opp.
          </button>
        </div>
      </div>

      {/* Content — isolated scroll container */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <KanbanView autoscuole={filtered} stages={stages} onDragEnd={handleDragEnd} onAddToStage={(stageId) => setNewOppStage(stageId)} isAdmin={isAdmin} salesUsers={salesUsers} />
      </div>

      {/* New opportunity dialog */}
      {newOppStage && (
        <NewOppDialog defaultStage={newOppStage} onClose={() => setNewOppStage(null)} />
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
            <option key={p} value={p}>{formatProvince(p)}</option>
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
  onAddToStage,
  isAdmin = false,
  salesUsers,
}: {
  autoscuole: AutoscuolaFlat[]
  stages: StageConfig[]
  onDragEnd: (result: DropResult) => void
  onAddToStage: (stageId: string) => void
  isAdmin?: boolean
  salesUsers: SalesUser[]
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto px-4 py-4" style={{ backgroundColor: "#F1F5F9" }}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            autoscuole={autoscuole.filter((a) => a.stageId === stage.id)}
            onAddToStage={onAddToStage}
            isAdmin={isAdmin}
            salesUsers={salesUsers}
          />
        ))}
      </div>
    </DragDropContext>
  )
}

function getSalesColor(salesName: string | null, salesUsers: SalesUser[]): string {
  if (!salesName) return "#94A3B8"
  const idx = salesUsers.findIndex((u) => u.name === salesName)
  return SALES_COLORS[idx >= 0 ? idx % SALES_COLORS.length : 0]
}

const INITIAL_VISIBLE = 30
const LOAD_MORE_COUNT = 50

function KanbanColumn({
  stage,
  autoscuole,
  onAddToStage,
  isAdmin,
  salesUsers,
}: {
  stage: StageConfig
  autoscuole: AutoscuolaFlat[]
  onAddToStage: (stageId: string) => void
  isAdmin: boolean
  salesUsers: SalesUser[]
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const items = autoscuole.slice(0, visibleCount)
  const hiddenCount = autoscuole.length - visibleCount

  return (
    <div className="flex w-[280px] shrink-0 flex-col" style={{ maxHeight: "100%" }}>
      {/* Column header — Notion style pill */}
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <div
          className="flex items-center gap-1.5 rounded-[999px] px-2.5 py-1"
          style={{ backgroundColor: stage.color + "18" }}
        >
          <span
            className="inline-block h-[8px] w-[8px] rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span
            className="text-[12px] font-semibold uppercase tracking-[0.3px]"
            style={{ color: stage.color }}
          >
            {stage.label}
          </span>
          <span
            className="text-[12px] font-medium"
            style={{ color: stage.color, opacity: 0.7 }}
          >
            {autoscuole.length}
          </span>
        </div>
        <button
          onClick={() => onAddToStage(stage.id)}
          className="ml-auto flex h-5 w-5 items-center justify-center rounded text-ink-400 transition-colors hover:bg-white hover:text-ink-600"
          title={`Aggiungi a ${stage.label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Droppable area — scrollable */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-[8px] p-0.5 transition-colors kanban-scroll"
            style={{
              backgroundColor: snapshot.isDraggingOver ? stage.color + "0A" : "transparent",
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
                    className="shrink-0 cursor-pointer rounded-[14px] border px-3.5 py-3 transition-shadow hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
                    style={{
                      ...provided.draggableProps.style,
                      backgroundColor: stage.color + "08",
                      borderColor: stage.color + "20",
                      boxShadow: snapshot.isDragging
                        ? "0 8px 24px rgba(15,23,42,0.12)"
                        : undefined,
                    }}
                  >
                    {/* Name */}
                    <p className="mb-0.5 text-[14px] font-bold leading-snug text-ink-900">
                      {item.name.replace("Autoscuola ", "")}
                    </p>
                    {/* Owner / Town */}
                    <p className="mb-2.5 text-[12.5px] text-ink-500">
                      {item.owner || `${item.town}, ${formatProvince(item.province)}`}
                    </p>

                    {/* Sales assignee */}
                    {isAdmin && item.salesName && (
                      <div className="mb-2.5 flex items-center gap-1.5">
                        <span
                          className="inline-block h-[10px] w-[10px] rounded-full"
                          style={{ backgroundColor: getSalesColor(item.salesName, salesUsers) }}
                        />
                        <span className="text-[12px] text-ink-600">{item.salesName}</span>
                      </div>
                    )}

                    {/* Phone */}
                    {item.phone && (
                      <p
                        className="mb-0.5 text-[13px] font-semibold"
                        style={{ color: "#0D9488" }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.location.href = `tel:${item.phone}`
                        }}
                      >
                        {item.phone}
                      </p>
                    )}
                    {/* Email */}
                    {item.email && (
                      <p className="mb-2 text-[12px] text-ink-500">{item.email}</p>
                    )}

                    {/* Footer: pipeline value + follow-up */}
                    {(item.pipelineValue || item.followUpAt || item.lastContact !== null) && (
                      <div className="flex items-center justify-between pt-1">
                        {item.pipelineValue ? (
                          <span className="text-[11.5px] font-semibold text-ink-500">
                            €{item.pipelineValue.toLocaleString("it-IT")}
                          </span>
                        ) : (
                          <span />
                        )}
                        {item.followUpAt ? (() => {
                          const fu = new Date(item.followUpAt)
                          const now = new Date()
                          const diffDays = Math.ceil((fu.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                          const isExpired = diffDays < 0
                          return (
                            <span
                              className="flex items-center gap-1 text-[10.5px] font-medium"
                              style={{ color: isExpired ? "#EF4444" : "#10B981" }}
                            >
                              <Clock className="h-3 w-3" />
                              {isExpired ? `−${Math.abs(diffDays)}g` : `${diffDays}g`}
                            </span>
                          )
                        })() : item.lastContact !== null ? (
                          <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
                            <Clock className="h-3 w-3" />
                            {item.lastContact}g
                          </span>
                        ) : null}
                      </div>
                    )}
                  </Link>
                )}
              </Draggable>
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}
                className="shrink-0 rounded-[8px] border border-dashed border-[#CBD5E1] py-2 text-center text-[11px] font-medium text-ink-400 transition-colors hover:border-ink-400 hover:text-ink-600"
              >
                +{hiddenCount} altre
              </button>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

function NewOppDialog({ defaultStage, onClose }: { defaultStage: string; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: "",
    owner: "",
    province: "",
    town: "",
    phone: "",
    email: "",
    stageId: defaultStage,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.province || !form.town) return
    startTransition(async () => {
      const id = await createAutoscuola(form)
      onClose()
      router.push(`/autoscuola/${id}`)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[520px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">Nuova opportunità</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Nome autoscuola *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              placeholder="Autoscuola XYZ"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Titolare</label>
            <input
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              placeholder="Mario Rossi"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Provincia *</label>
              <input
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value.toUpperCase().slice(0, 2) })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="RM"
                maxLength={2}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Città *</label>
              <input
                value={form.town}
                onChange={(e) => setForm({ ...form, town: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="Roma"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Telefono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="+39 06 1234 5678"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                placeholder="info@autoscuola.it"
                type="email"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Stage iniziale</label>
            <select
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
            >
              {isPending ? "Creazione..." : "Crea opportunità"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
