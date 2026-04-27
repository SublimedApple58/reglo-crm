"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  FileSignature,
  Clock,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Building,
  XCircle,
  Trash2,
  Upload,
  FileText,
  X,
} from "lucide-react"
import {
  updateContractRequestStatus,
  rejectContractRequest,
  deleteContractRequest,
  completeContractRequest,
} from "@/lib/actions/contracts"
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
  rejected: { label: "Rimandato", color: "#EF4444", bg: "#FEE2E2", icon: XCircle },
} as const

const FILTERS = [
  { key: "all", label: "Tutte" },
  { key: "pending", label: "In attesa" },
  { key: "in_progress", label: "In lavorazione" },
  { key: "rejected", label: "Rimandate" },
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type UploadedFile = {
  key: string
  name: string
  size: number
}

function CompleteContractDialog({
  request,
  userName,
  autoscuolaName,
  onClose,
  onComplete,
}: {
  request: ContractRequest
  userName: string
  autoscuolaName: string
  onClose: () => void
  onComplete: () => void
}) {
  const [contractFile, setContractFile] = useState<UploadedFile | null>(null)
  const [invoiceFile, setInvoiceFile] = useState<UploadedFile | null>(null)
  const [uploadingContract, setUploadingContract] = useState(false)
  const [uploadingInvoice, setUploadingInvoice] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const contractInputRef = useRef<HTMLInputElement>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (
      file: File,
      setFile: (f: UploadedFile | null) => void,
      setUploading: (v: boolean) => void
    ) => {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload-contract", {
          method: "POST",
          body: formData,
        })
        if (!res.ok) {
          alert("Errore durante il caricamento")
          return
        }
        const data = await res.json()
        setFile({ key: data.key, name: data.name, size: data.size })
      } catch {
        alert("Errore durante il caricamento")
      } finally {
        setUploading(false)
      }
    },
    []
  )

  function handleConfirm() {
    startTransition(async () => {
      await completeContractRequest(request.id, {
        contractPdfKey: contractFile?.key,
        contractPdfName: contractFile?.name,
        invoicePdfKey: invoiceFile?.key,
        invoicePdfName: invoiceFile?.name,
      })
      onComplete()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[520px] rounded-[20px] border border-border-1 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border-1 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-ink-900">
                Carica Documenti Ufficiali
              </h2>
              <p className="text-[12.5px] text-ink-500">
                {autoscuolaName} &middot; Sales: {userName}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {/* Contract upload */}
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink-700">
              1. Contratto Firmato
            </p>
            {contractFile ? (
              <div className="flex items-center gap-3 rounded-[12px] border-2 border-green-200 bg-green-50/50 p-3">
                <FileText className="h-5 w-5 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink-900">
                    {contractFile.name}
                  </p>
                  <p className="text-[11.5px] text-ink-400">
                    {formatFileSize(contractFile.size)}
                  </p>
                </div>
                <button
                  onClick={() => setContractFile(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => contractInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleUpload(file, setContractFile, setUploadingContract)
                }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border-2 bg-surface-2/50 p-6 transition-colors hover:border-pink hover:bg-pink/5"
              >
                {uploadingContract ? (
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-ink-400" />
                ) : (
                  <Upload className="mb-2 h-6 w-6 text-ink-400" />
                )}
                <p className="text-[12.5px] text-ink-500">
                  {uploadingContract
                    ? "Caricamento..."
                    : "Trascina o clicca per caricare PDF"}
                </p>
              </div>
            )}
            <input
              ref={contractInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file, setContractFile, setUploadingContract)
                e.target.value = ""
              }}
            />
          </div>

          {/* Invoice upload */}
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink-700">
              2. Fattura Emessa
            </p>
            {invoiceFile ? (
              <div className="flex items-center gap-3 rounded-[12px] border-2 border-green-200 bg-green-50/50 p-3">
                <FileText className="h-5 w-5 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink-900">
                    {invoiceFile.name}
                  </p>
                  <p className="text-[11.5px] text-ink-400">
                    {formatFileSize(invoiceFile.size)}
                  </p>
                </div>
                <button
                  onClick={() => setInvoiceFile(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => invoiceInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleUpload(file, setInvoiceFile, setUploadingInvoice)
                }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border-2 bg-surface-2/50 p-6 transition-colors hover:border-pink hover:bg-pink/5"
              >
                {uploadingInvoice ? (
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-ink-400" />
                ) : (
                  <Upload className="mb-2 h-6 w-6 text-ink-400" />
                )}
                <p className="text-[12.5px] text-ink-500">
                  {uploadingInvoice
                    ? "Caricamento..."
                    : "Trascina o clicca per caricare PDF"}
                </p>
              </div>
            )}
            <input
              ref={invoiceInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file, setInvoiceFile, setUploadingInvoice)
                e.target.value = ""
              }}
            />
          </div>

          {/* Confirmation checkbox */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-border-1 bg-surface-2/50 p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border-1 accent-pink"
            />
            <span className="text-[12.5px] leading-relaxed text-ink-600">
              Confermo che i documenti sono corretti. Il Sales ricevera una notifica.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border-1 px-6 py-4">
          <button
            onClick={onClose}
            className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || isPending}
            className="h-9 rounded-[999px] bg-green-500 px-5 text-[13px] font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {isPending ? "Completamento..." : "Approva e Invia Documenti"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function GestioneContrattiClient({ requests: initial }: { requests: RequestRow[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [adminNotesMap, setAdminNotesMap] = useState<Record<number, string>>(() =>
    Object.fromEntries(initial.map((r) => [r.request.id, r.request.adminNotes ?? ""]))
  )
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [completeDialogRow, setCompleteDialogRow] = useState<RequestRow | null>(null)

  const filtered = filter === "all" ? initial : initial.filter((r) => r.request.status === filter)

  function handleStatusChange(id: number, status: "pending" | "in_progress" | "done" | "rejected") {
    startTransition(async () => {
      await updateContractRequestStatus(id, status, adminNotesMap[id] || undefined)
      router.refresh()
    })
  }

  function handleSaveNotes(id: number) {
    startTransition(async () => {
      await updateContractRequestStatus(
        id,
        initial.find((r) => r.request.id === id)!.request.status as "pending" | "in_progress" | "done" | "rejected",
        adminNotesMap[id] || undefined
      )
      router.refresh()
    })
  }

  function handleReject(id: number) {
    startTransition(async () => {
      await rejectContractRequest(id, rejectReason || undefined)
      setRejectingId(null)
      setRejectReason("")
      router.refresh()
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteContractRequest(id)
      setDeleteConfirmId(null)
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
                      {/* Importo preventivo + Descrizione servizio */}
                      {(req.importoPreventivo || req.descrizioneServizio) && (
                        <div className="mb-4 rounded-[10px] bg-amber-50/60 border border-amber-200/60 p-3">
                          <h4 className="mb-2 text-[11.5px] font-semibold tracking-wider text-amber-600 uppercase">
                            Dettagli preventivo
                          </h4>
                          <div className="space-y-1.5">
                            {req.importoPreventivo != null && (
                              <div className="flex justify-between text-[13px]">
                                <span className="text-ink-500">Importo preventivo</span>
                                <span className="font-semibold text-ink-900">
                                  {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(req.importoPreventivo)}
                                </span>
                              </div>
                            )}
                            {req.descrizioneServizio && (
                              <div className="text-[13px]">
                                <span className="text-ink-500">Servizio: </span>
                                <span className="text-ink-700">{req.descrizioneServizio}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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
                                {value || "\u2013"}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Rejection reason (if rejected) */}
                      {req.status === "rejected" && req.rejectionReason && (
                        <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50/60 p-3">
                          <span className="text-[11.5px] font-semibold text-red-500">Motivo rifiuto: </span>
                          <span className="text-[13px] text-red-700">{req.rejectionReason}</span>
                        </div>
                      )}

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

                      {/* Reject inline form */}
                      {rejectingId === req.id && (
                        <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50/30 p-3">
                          <p className="mb-2 text-[12.5px] font-semibold text-red-600">
                            Motivo del rifiuto (facoltativo)
                          </p>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Indica il motivo per cui rimandi indietro la richiesta..."
                            className="mb-2 w-full resize-none rounded-[8px] border border-red-200 bg-white p-2.5 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={isPending}
                              className="rounded-[999px] bg-red-500 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              Conferma rifiuto
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(null)
                                setRejectReason("")
                              }}
                              className="rounded-[999px] border border-border-1 px-4 py-1.5 text-[12px] font-medium text-ink-600 hover:bg-surface-2"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
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
                            onClick={() =>
                              setCompleteDialogRow({ request: req, user, autoscuola })
                            }
                            disabled={isPending}
                            className="rounded-[999px] bg-green-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                          >
                            Segna come fatto
                          </button>
                        )}
                        {(req.status === "pending" || req.status === "in_progress") &&
                          rejectingId !== req.id && (
                            <button
                              onClick={() => {
                                setRejectingId(req.id)
                                setRejectReason("")
                              }}
                              disabled={isPending}
                              className="rounded-[999px] border border-red-200 px-4 py-2 text-[12px] font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                              Rimanda indietro
                            </button>
                          )}
                        {req.status === "done" && (
                          <span className="flex items-center gap-1 text-[12.5px] font-medium text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Completato
                          </span>
                        )}
                        <button
                          onClick={() => setDeleteConfirmId(req.id)}
                          disabled={isPending}
                          className="ml-auto flex items-center gap-1 rounded-[999px] border border-border-1 px-3 py-2 text-[12px] font-medium text-ink-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Elimina
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Complete dialog */}
      {completeDialogRow && (
        <CompleteContractDialog
          request={completeDialogRow.request}
          userName={completeDialogRow.user.name}
          autoscuolaName={completeDialogRow.autoscuola.name}
          onClose={() => setCompleteDialogRow(null)}
          onComplete={() => {
            setCompleteDialogRow(null)
            router.refresh()
          }}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteConfirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-[420px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-[18px] font-bold text-ink-900">
              Elimina richiesta
            </h2>
            <p className="mb-5 text-[13px] text-ink-500">
              Stai per eliminare questa richiesta contratto. Eventuali documenti
              caricati verranno eliminati. Questa azione è irreversibile.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isPending}
                className="h-9 rounded-[999px] bg-red-500 px-5 text-[13px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? "Eliminazione..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
