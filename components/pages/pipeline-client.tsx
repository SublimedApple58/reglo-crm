"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Clock,
  Building,
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
}

type StageConfig = {
  id: string
  label: string
  color: string
  tone: string
  order: number
}

export function PipelineClient({
  autoscuole: initialAutoscuole,
  stages,
}: {
  autoscuole: AutoscuolaFlat[]
  stages: StageConfig[]
}) {
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [search, setSearch] = useState("")
  const [autoscuole, setAutoscuole] = useState(initialAutoscuole)

  const filtered = autoscuole.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      a.town.toLowerCase().includes(q) ||
      a.province.toLowerCase().includes(q)
    )
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

        <button className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 hover:border-ink-300 hover:bg-surface-2">
          <Filter className="h-3.5 w-3.5" />
          Filtri
        </button>

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
          {autoscuole.slice(0, 60).map((a) => (
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
