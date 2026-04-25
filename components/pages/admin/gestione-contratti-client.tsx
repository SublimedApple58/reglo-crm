"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  FileSignature,
  Clock,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Building,
} from "lucide-react"
import { updateContractRequestStatus } from "@/lib/actions/contracts"
import type { ContractRequest } from "@/lib/db/schema"

type RequestRow = {
  request: ContractRequest
  user: { id: string; name: string }
  autoscuola: { id: string; name: string; town: string; province: string }
}

const STATUS_CONFIG = {
  pending: { label: "In attesa", color: "#F59E0B", bg: "#FEF3C7", icon: Clock },
  in_progress: { label: "In lavorazione", color: "#3B82F6", bg: "#DBEAFE", icon: Loader2 },
  done: { label: "Completato", color: "#10B981", bg: "#D1FAE5", icon: CheckCircle2 },
} as const

const FILTERS = [
  { key: "all", label: "Tutte" },
  { key: "pending", label: "In attesa" },
  { key: "in_progress", label: "In lavorazione" },
  { key: "done", label: "Completate" },
] as const

const FISCAL_FIELDS = [
  { key: "ragioneSociale", label: "Ragione sociale" },
  { key: "partitaIva", label: "Partita IVA" },
  { key: "codiceFiscale", label: "Codice fiscale" },
  { key: "pecEmail", label: "PEC" },
  { key: "codiceSDI", label: "Codice SDI" },
  { key: "indirizzoFatturazione", label: "Indirizzo fatturazione" },
  { key: "capFatturazione", label: "CAP" },
  { key: "cittaFatturazione", label: "Città" },
  { key: "provinciaFatturazione", label: "Provincia" },
] as const

export function GestioneContrattiClient({ requests: initial }: { requests: RequestRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [adminNotesMap, setAdminNotesMap] = useState<Record<number, string>>(() =>
    Object.fromEntries(initial.map((r) => [r.request.id, r.request.adminNotes ?? ""]))
  )

  const filtered = filter === "all" ? initial : initial.filter((r) => r.request.status === filter)

  function handleStatusChange(id: number, status: "pending" | "in_progress" | "done") {
    startTransition(async () => {
      await updateContractRequestStatus(id, status, adminNotesMap[id] || undefined)
      router.refresh()
    })
  }

  function handleSaveNotes(id: number) {
    startTransition(async () => {
      await updateContractRequestStatus(id, initial.find((r) => r.request.id === id)!.request.status as "pending" | "in_progress" | "done", adminNotesMap[id] || undefined)
      router.refresh()
    })
  }

  return (
    <div className="flex h-[calc(100vh)] flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-1 px-7 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pink/10">
            <FileSignature className="h-5 w-5 text-pink" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-[-0.4px] text-ink-900">
              Gestione contratti
            </h1>
            <p className="text-[12.5px] text-ink-500">
              {initial.length} richieste totali &middot;{" "}
              {initial.filter((r) => r.request.status === "pending").length} in attesa
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-1.5">
          {FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? initial.length
                : initial.filter((r) => r.request.status === f.key).length
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex items-center gap-1.5 rounded-[999px] px-3.5 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: filter === f.key ? "#FDF2F8" : "transparent",
                  color: filter === f.key ? "#EC4899" : "#64748B",
                  border: `1px solid ${filter === f.key ? "#FBCFE8" : "#E2E8F0"}`,
                }}
              >
                {f.label}
                <span
                  className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 font-mono text-[10px]"
                  style={{
                    backgroundColor: filter === f.key ? "#EC4899" : "#F1F5F9",
                    color: filter === f.key ? "white" : "#64748B",
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-7">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSignature className="mb-3 h-12 w-12 text-ink-300" />
            <p className="text-[14px] font-medium text-ink-500">Nessuna richiesta</p>
            <p className="text-[12.5px] text-ink-400">Non ci sono richieste con questo filtro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ request: req, user, autoscuola }) => {
              const status = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
              const StatusIcon = status.icon
              const isExpanded = expandedId === req.id

              return (
                <div
                  key={req.id}
                  className="rounded-[14px] border border-border-1 bg-surface transition-shadow hover:shadow-sm"
                >
                  {/* Card header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2">
                      <Building className="h-5 w-5 text-ink-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink-900">
                        {autoscuola.name}
                      </p>
                      <p className="text-[12px] text-ink-400">
                        {autoscuola.town} ({autoscuola.province}) &middot; Sales: {user.name} &middot;{" "}
                        {new Date(req.createdAt).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className="flex items-center gap-1 rounded-[999px] px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-ink-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-ink-400" />
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border-1 p-4">
                      {/* Fiscal data */}
                      <h4 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
                        Dati fiscali
                      </h4>
                      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2">
                        {FISCAL_FIELDS.map((field) => {
                          const value = req[field.key as keyof typeof req] as string | null
                          return (
                            <div key={field.key} className="flex justify-between text-[13px]">
                              <span className="text-ink-500">{field.label}</span>
                              <span className="font-medium text-ink-900">
                                {value || "–"}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Sales notes */}
                      {req.notes && (
                        <div className="mb-4 rounded-[10px] bg-surface-2/60 p-3">
                          <span className="text-[11.5px] font-semibold text-ink-400">Note del sales: </span>
                          <span className="text-[13px] text-ink-700">{req.notes}</span>
                        </div>
                      )}

                      {/* Admin notes */}
                      <div className="mb-4">
                        <label className="mb-1.5 block text-[12px] font-semibold text-ink-500">
                          Note admin (non visibili al sales)
                        </label>
                        <textarea
                          value={adminNotesMap[req.id] ?? ""}
                          onChange={(e) =>
                            setAdminNotesMap((prev) => ({ ...prev, [req.id]: e.target.value }))
                          }
                          placeholder="Note interne..."
                          className="w-full resize-none rounded-[10px] border border-border-1 bg-surface p-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
                          rows={2}
                        />
                        <button
                          onClick={() => handleSaveNotes(req.id)}
                          disabled={isPending}
                          className="mt-1.5 text-[12px] font-medium text-pink hover:text-pink/80 disabled:opacity-50"
                        >
                          Salva note
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {req.status === "pending" && (
                          <button
                            onClick={() => handleStatusChange(req.id, "in_progress")}
                            disabled={isPending}
                            className="rounded-[999px] bg-blue-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
                          >
                            Prendi in carico
                          </button>
                        )}
                        {(req.status === "pending" || req.status === "in_progress") && (
                          <button
                            onClick={() => handleStatusChange(req.id, "done")}
                            disabled={isPending}
                            className="rounded-[999px] bg-green-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                          >
                            Segna come fatto
                          </button>
                        )}
                        {req.status === "done" && (
                          <span className="flex items-center gap-1 text-[12.5px] font-medium text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Completato
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
