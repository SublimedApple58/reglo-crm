"use client"

import { useState, useTransition, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Building,
  MapPin,
  Users,
  Phone,
  Mail,
  Calendar,
  Clock,
  Check,
  Send,
  MessageSquare,
  Video,
  Sparkles,
  FileText,
  StickyNote,
  Download,
  Trash2,
  Upload,
  File,
} from "lucide-react"
import { STAGES } from "@/lib/constants"
import { formatProvince } from "@/lib/utils"
import { updateAutoscuolaStage, updateAutoscuola, updateAutoscuolaInfo, createActivity, deleteAutoscuola, setFollowUp } from "@/lib/actions/autoscuole"
import { deleteDocument } from "@/lib/actions/documents"
import { MeetingDialog } from "@/components/meeting-dialog"
import { DateTimePicker } from "@/components/date-time-picker"
import type { Autoscuola, PipelineStage, User, Activity, Document } from "@/lib/db/schema"

type ActivityFlat = Activity & {
  userName: string
  userColor: string
  userInitials: string
  status: string
  scheduledAt: Date | null
}

type DocumentWithUser = {
  document: Document
  user: { id: string; name: string }
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(contentType: string) {
  if (contentType === "application/pdf") return FileText
  if (contentType.startsWith("image/")) return File
  return File
}

export function AutoscuolaClient({
  autoscuola,
  stage,
  salesUser,
  activities,
  stages,
  documents,
  isAdmin = false,
  googleConnected = false,
}: {
  autoscuola: Autoscuola
  stage: PipelineStage
  salesUser: User | null
  activities: ActivityFlat[]
  stages: typeof STAGES extends readonly (infer T)[] ? T[] : never
  documents: DocumentWithUser[]
  isAdmin?: boolean
  googleConnected?: boolean
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("attivita")
  const [currentStageId, setCurrentStageId] = useState(autoscuola.stageId)
  const [isPending, startTransition] = useTransition()
  const [activityText, setActivityText] = useState("")
  const [activityType, setActivityType] = useState<"call" | "email" | "meeting" | "note">("call")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)

  const currentStageOrder = STAGES.findIndex((s) => s.id === currentStageId)

  function handleStageClick(stageId: string) {
    setCurrentStageId(stageId)
    startTransition(() => {
      updateAutoscuolaStage(autoscuola.id, stageId)
    })
  }

  function handleAddActivity() {
    if (!activityText.trim()) return
    startTransition(async () => {
      await createActivity({
        autoscuolaId: autoscuola.id,
        type: activityType,
        title:
          activityType === "call"
            ? `Chiamata registrata`
            : activityType === "email"
            ? `Email inviata`
            : activityType === "meeting"
            ? `Meeting registrato`
            : `Nota aggiunta`,
        body: activityText,
      })
      setActivityText("")
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAutoscuola(autoscuola.id)
      router.push("/pipeline")
    })
  }

  const commissionRate = autoscuola.commissionRate ?? 0.15
  const closeProbability = autoscuola.closeProbability ?? null

  const tabs = [
    { id: "attivita", label: "Attività" },
    { id: "informazioni", label: "Informazioni" },
    { id: "anagrafica", label: "Anagrafica" },
    { id: "documenti", label: "Documenti" },
    { id: "contratto", label: "Contratto" },
    { id: "note", label: "Note" },
  ]

  return (
    <div className="grid h-[calc(100vh)] grid-cols-[1fr_340px]">
      {/* Main content */}
      <div className="flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border-1 px-7 py-5">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-surface-2 to-border-2">
              <Building className="h-6 w-6 text-ink-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-[22px] font-bold tracking-[-0.4px] text-ink-900">
                {autoscuola.name}
              </h1>
              <p className="flex items-center gap-2 text-[12.5px] text-ink-500">
                <MapPin className="h-3 w-3" />
                {autoscuola.town}, {formatProvince(autoscuola.province)}
                {autoscuola.students ? (
                  <>
                    <span className="mx-1 text-ink-300">·</span>
                    <Users className="h-3 w-3" />
                    {autoscuola.students} allievi
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex gap-2">
              {autoscuola.phone ? (
                <a
                  href={`tel:${autoscuola.phone}`}
                  className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 hover:bg-surface-2"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Chiama
                </a>
              ) : (
                <button disabled className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-400 opacity-50">
                  <Phone className="h-3.5 w-3.5" />
                  Chiama
                </button>
              )}
              {autoscuola.email ? (
                <a
                  href={`mailto:${autoscuola.email}`}
                  className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 hover:bg-surface-2"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              ) : (
                <button disabled className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-400 opacity-50">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </button>
              )}
              <button
                onClick={() => setShowMeetingDialog(true)}
                className="flex h-8 items-center gap-1.5 rounded-[999px] bg-pink px-3 text-[12px] font-semibold text-white hover:bg-pink/90"
              >
                <Calendar className="h-3.5 w-3.5" />
                Fissa meeting
              </button>
            </div>
          </div>

          {/* Stage stepper */}
          <div className="flex gap-1.5">
            {STAGES.map((s, i) => {
              const isCurrent = s.id === currentStageId
              const isPast = i < currentStageOrder

              return (
                <button
                  key={s.id}
                  onClick={() => handleStageClick(s.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[999px] py-[6px] text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: isCurrent
                      ? s.color
                      : isPast
                      ? s.color + "20"
                      : "#F8FAFC",
                    color: isCurrent ? "white" : isPast ? s.color : "#94A3B8",
                    border: `1px solid ${isCurrent ? s.color : isPast ? s.color + "30" : "#E2E8F0"}`,
                  }}
                >
                  {isPast && <Check className="h-3 w-3" />}
                  <span
                    className="inline-block h-[6px] w-[6px] rounded-full"
                    style={{
                      backgroundColor: isCurrent ? "white" : s.color,
                      display: isPast ? "none" : "inline-block",
                    }}
                  />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border-1 px-7">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3 text-[13px] font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? "#EC4899" : "#64748B",
                fontWeight: activeTab === tab.id ? 600 : 500,
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-pink" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-7">
          {activeTab === "attivita" && (
            <div>
              {/* Composer */}
              <div className="mb-6 rounded-[14px] border border-border-1 bg-surface p-4">
                <textarea
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  placeholder="Registra un'attività…"
                  className="mb-3 w-full resize-none rounded-[10px] border border-border-2 bg-surface-2 p-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {(
                      [
                        { type: "call" as const, icon: Phone, label: "Call log" },
                        { type: "email" as const, icon: Mail, label: "Email" },
                        { type: "meeting" as const, icon: Video, label: "Meeting" },
                        { type: "note" as const, icon: StickyNote, label: "Nota" },
                      ] as const
                    ).map((btn) => (
                      <button
                        key={btn.type}
                        onClick={() => setActivityType(btn.type)}
                        className="flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-medium transition-colors"
                        style={{
                          backgroundColor:
                            activityType === btn.type ? "#FDF2F8" : "transparent",
                          color:
                            activityType === btn.type ? "#EC4899" : "#64748B",
                        }}
                      >
                        <btn.icon className="h-3.5 w-3.5" />
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleAddActivity}
                    disabled={!activityText.trim() || isPending}
                    className="flex items-center gap-1.5 rounded-[999px] bg-pink px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    Registra
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative pl-7">
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border-1" />
                {activities.map((a) => {
                  const isFuture = a.scheduledAt && new Date(a.scheduledAt) > new Date()
                  const isCancelled = a.status === "cancelled"
                  const displayDate = a.scheduledAt ?? a.createdAt

                  return (
                  <div key={a.id} className={`relative mb-5 pl-5 ${isFuture && !isCancelled ? "opacity-100" : ""}`}>
                    <div
                      className={`absolute left-[-16px] top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border ${isFuture && !isCancelled ? "border-dashed" : ""}`}
                      style={{
                        borderColor: isFuture && !isCancelled ? "#3B82F6" + "60" : a.userColor + "40",
                        backgroundColor: isFuture && !isCancelled ? "#EFF6FF" : "white",
                      }}
                    >
                      {a.type === "call" ? (
                        <Phone className="h-3 w-3" style={{ color: isFuture && !isCancelled ? "#3B82F6" : a.userColor }} />
                      ) : a.type === "email" ? (
                        <Mail className="h-3 w-3" style={{ color: isFuture && !isCancelled ? "#3B82F6" : a.userColor }} />
                      ) : a.type === "meeting" ? (
                        <Video className="h-3 w-3" style={{ color: isFuture && !isCancelled ? "#3B82F6" : a.userColor }} />
                      ) : a.type === "stage_change" ? (
                        <Sparkles className="h-3 w-3" style={{ color: a.userColor }} />
                      ) : (
                        <MessageSquare className="h-3 w-3" style={{ color: a.userColor }} />
                      )}
                    </div>
                    <p className="mb-0.5 text-[11.5px] text-ink-400">
                      {a.userName} ·{" "}
                      {displayDate
                        ? new Date(displayDate).toLocaleDateString("it-IT", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                    <p className={`text-[13px] font-semibold ${isCancelled ? "text-ink-400 line-through" : isFuture ? "text-blue-600" : "text-ink-900"}`}>
                      {a.title}
                      {isCancelled && (
                        <span className="ml-2 inline-block rounded-[4px] bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 no-underline" style={{ textDecoration: "none" }}>
                          Annullato
                        </span>
                      )}
                      {isFuture && !isCancelled && (
                        <span className="ml-2 inline-block rounded-[4px] bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
                          Programmato
                        </span>
                      )}
                    </p>
                    {a.body && (
                      <p className={`mt-0.5 text-[12.5px] leading-relaxed ${isFuture ? "text-ink-400" : "text-ink-600"}`}>
                        {a.body}
                      </p>
                    )}
                    {a.meetLink && (
                      <a
                        href={a.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-[999px] px-3 py-1 text-[11.5px] font-semibold ${
                          isFuture
                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            : "bg-pink/10 text-pink hover:bg-pink/20"
                        }`}
                      >
                        <Video className="h-3 w-3" />
                        Partecipa al meeting
                      </a>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === "informazioni" && (
            <InformazioniTab autoscuola={autoscuola} />
          )}

          {activeTab === "anagrafica" && (
            <AnagraficaTab
              autoscuola={autoscuola}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          )}

          {activeTab === "documenti" && (
            <DocumentiTab
              documents={documents}
              autoscuolaId={autoscuola.id}
            />
          )}

          {activeTab === "contratto" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-3 h-12 w-12 text-ink-300" />
              <p className="text-[14px] font-medium text-ink-500">Nessun contratto attivo</p>
              <p className="text-[12.5px] text-ink-400">
                Il contratto apparirà qui quando lo stage sarà &quot;Cliente&quot;
              </p>
            </div>
          )}

          {activeTab === "note" && (
            <NoteTab autoscuola={autoscuola} />
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="flex flex-col gap-0 overflow-y-auto border-l border-border-1 bg-surface">
        {/* Contatti */}
        <div className="border-b border-border-1 p-5">
          <h3 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
            Contatti
          </h3>
          <div className="space-y-2.5">
            {autoscuola.phone && (
              <a href={`tel:${autoscuola.phone}`} className="flex items-center gap-2.5 text-[13px] hover:text-pink">
                <Phone className="h-3.5 w-3.5 text-ink-400" />
                <span className="text-ink-700">{autoscuola.phone}</span>
              </a>
            )}
            {autoscuola.email && (
              <a href={`mailto:${autoscuola.email}`} className="flex items-center gap-2.5 text-[13px] hover:text-pink">
                <Mail className="h-3.5 w-3.5 text-ink-400" />
                <span className="text-ink-700">{autoscuola.email}</span>
              </a>
            )}
            {autoscuola.address && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <MapPin className="h-3.5 w-3.5 text-ink-400" />
                <span className="text-ink-700">{autoscuola.address}</span>
              </div>
            )}
            {!autoscuola.phone && !autoscuola.email && !autoscuola.address && (
              <p className="text-[12.5px] text-ink-400">Nessun contatto disponibile</p>
            )}
          </div>
        </div>

        {/* Sales owner — visible only to admins */}
        {isAdmin && (
          <div className="border-b border-border-1 p-5">
            <h3 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
              Assegnata a
            </h3>
            {salesUser ? (
              <div className="flex items-center gap-2.5">
                {salesUser.avatar ? (
                  <img src={salesUser.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: salesUser.color }}
                  >
                    {salesUser.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                )}
                <div>
                  <p className="text-[13px] font-semibold text-ink-900">{salesUser.name}</p>
                  <p className="text-[11.5px] text-ink-400">{salesUser.territory}</p>
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] text-ink-400">Non assegnata</p>
            )}
          </div>
        )}

        {/* Deal info — real data */}
        <div className="border-b border-border-1 p-5">
          <h3 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
            Deal
          </h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Pacchetto</span>
              <span className="font-medium text-ink-900">{autoscuola.package ?? "–"}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Valore</span>
              <span className="font-mono font-semibold text-ink-900">
                {autoscuola.pipelineValue ? `€${autoscuola.pipelineValue.toLocaleString("it-IT")}` : "–"}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Commissione ({Math.round(commissionRate * 100)}%)</span>
              <span className="font-mono font-medium text-green">
                {autoscuola.pipelineValue
                  ? `€${Math.round(autoscuola.pipelineValue * commissionRate).toLocaleString("it-IT")}`
                  : "–"}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Prob. chiusura</span>
              <span className="font-medium text-ink-900">
                {closeProbability !== null ? `${closeProbability}%` : "–"}
              </span>
            </div>
            {autoscuola.expectedCloseDate && (
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-500">Chiusura prevista</span>
                <span className="font-medium text-ink-900">
                  {new Date(autoscuola.expectedCloseDate).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Follow-up */}
        <div className="border-b border-border-1 p-5">
          <h3 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
            Follow-up
          </h3>
          <FollowUpPicker autoscuolaId={autoscuola.id} initialDate={autoscuola.followUpAt} />
        </div>

      </div>

      {/* Meeting dialog */}
      {showMeetingDialog && (
        <MeetingDialog
          onClose={() => setShowMeetingDialog(false)}
          onCreated={() => setShowMeetingDialog(false)}
          defaultTitle={`Meeting con ${autoscuola.name}`}
          defaultGuests={autoscuola.email ? [autoscuola.email] : []}
          autoscuolaId={autoscuola.id}
          googleConnected={googleConnected}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-[420px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-[18px] font-bold text-ink-900">Elimina autoscuola</h2>
            <p className="mb-5 text-[13px] text-ink-500">
              Stai per eliminare &quot;{autoscuola.name}&quot;. Verranno eliminati anche documenti, attività e commissioni associate. Questa azione è irreversibile.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
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

function AnagraficaTab({ autoscuola, onDelete }: { autoscuola: Autoscuola; onDelete: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: autoscuola.name,
    owner: autoscuola.owner ?? "",
    phone: autoscuola.phone ?? "",
    email: autoscuola.email ?? "",
    address: autoscuola.address ?? "",
  })

  function handleSave() {
    startTransition(() => {
      updateAutoscuola(autoscuola.id, form)
    })
  }

  return (
    <div className="max-w-[560px] space-y-4">
      {[
        { label: "Nome", key: "name" as const },
        { label: "Titolare", key: "owner" as const },
        { label: "Telefono", key: "phone" as const },
        { label: "Email", key: "email" as const },
        { label: "Indirizzo", key: "address" as const },
      ].map((field) => (
        <div key={field.key}>
          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">
            {field.label}
          </label>
          <input
            value={form[field.key]}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="mt-2 rounded-[999px] bg-pink px-5 py-2 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
        >
          Salva modifiche
        </button>
        <button
          onClick={onDelete}
          className="mt-2 rounded-[999px] border border-red-200 px-5 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50"
        >
          Elimina autoscuola
        </button>
      </div>
    </div>
  )
}

function DocumentiTab({
  documents,
  autoscuolaId,
}: {
  documents: DocumentWithUser[]
  autoscuolaId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setUploading(true)

      try {
        for (const file of Array.from(files)) {
          if (!ACCEPTED_TYPES.includes(file.type)) {
            alert(`Tipo file non supportato: ${file.name}`)
            continue
          }

          const formData = new FormData()
          formData.append("file", file)
          formData.append("autoscuolaId", autoscuolaId)

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          if (!res.ok) {
            alert(`Errore durante il caricamento di ${file.name}`)
            continue
          }
        }

        startTransition(() => {
          router.refresh()
        })
      } catch {
        alert("Errore durante il caricamento")
      } finally {
        setUploading(false)
      }
    },
    [autoscuolaId]
  )

  const handleDownload = useCallback(async (docId: number, name: string) => {
    const res = await fetch(`/api/upload/${docId}`)
    if (!res.ok) return
    const { url } = await res.json()
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    a.click()
  }, [])

  const handleDelete = useCallback((docId: number) => {
    if (!confirm("Eliminare questo documento?")) return
    startTransition(async () => {
      await deleteDocument(docId)
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleUpload(e.dataTransfer.files)
    },
    [handleUpload]
  )

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-pink bg-pink/5"
            : "border-border-2 bg-surface-2/50"
        }`}
      >
        <Upload
          className={`mb-3 h-8 w-8 ${
            isDragging ? "text-pink" : "text-ink-400"
          }`}
        />
        <p className="mb-1 text-[13px] font-medium text-ink-700">
          {uploading
            ? "Caricamento in corso..."
            : isDragging
            ? "Rilascia i file qui"
            : "Trascina i file qui o clicca per caricare"}
        </p>
        <p className="mb-3 text-[11.5px] text-ink-400">
          PDF, DOCX, XLSX, immagini
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-[999px] bg-pink px-4 py-2 text-[12px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Caricamento..." : "Carica file"}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="mb-3 h-12 w-12 text-ink-300" />
          <p className="text-[14px] font-medium text-ink-500">
            Nessun documento caricato
          </p>
          <p className="text-[12.5px] text-ink-400">
            Carica contratti, preventivi e altri file
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(({ document: doc, user }) => {
            const IconComponent = getFileIcon(doc.contentType)
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-[12px] border border-border-1 bg-surface p-3 transition-colors hover:bg-surface-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2">
                  <IconComponent className="h-5 w-5 text-ink-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink-900">
                    {doc.name}
                  </p>
                  <p className="text-[11.5px] text-ink-400">
                    {formatFileSize(doc.size)} · {user.name} ·{" "}
                    {doc.createdAt
                      ? new Date(doc.createdAt).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDownload(doc.id, doc.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-700"
                    title="Scarica"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NoteTab({ autoscuola }: { autoscuola: Autoscuola }) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(autoscuola.notes ?? "")

  function handleSave() {
    startTransition(() => {
      updateAutoscuola(autoscuola.id, { notes })
    })
  }

  return (
    <div className="max-w-[560px]">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Aggiungi note su questa autoscuola…"
        className="mb-3 w-full resize-none rounded-[12px] border border-border-1 bg-surface p-4 text-[13px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
        rows={8}
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="rounded-[999px] bg-pink px-5 py-2 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
      >
        Salva note
      </button>
    </div>
  )
}

const INFO_FIELDS = [
  { key: "sedi_totali", label: "Sedi totali" },
  { key: "istruttori", label: "Istruttori (Full / Part-time)" },
  { key: "veicoli_totali", label: "Veicoli totali" },
  { key: "costo_guida_30", label: "Costo Guida (30 minuti)" },
  { key: "costo_guida_60", label: "Costo Guida (60 minuti)" },
  { key: "allievi_attivi", label: "Allievi attivi (Circa)" },
  { key: "guide_medie_giorno", label: "Guide medie al giorno" },
  { key: "metodo_prenotazione", label: "Metodo attuale di prenotazione" },
  { key: "gestione_chiamate", label: "Gestione chiamate (Chi risponde?)" },
  { key: "chiamate_perse", label: "Chiamate perse o fuori orario" },
  { key: "frequenza_noshow", label: "Frequenza No-Show" },
  { key: "penale_noshow", label: "Penale per No-Show" },
  { key: "sistema_promemoria", label: "Sistema di promemoria attuale" },
  { key: "metodo_pagamento", label: "Metodo e momento di pagamento" },
  { key: "note_prospect", label: "Note principali del prospect" },
]

function InformazioniTab({ autoscuola }: { autoscuola: Autoscuola }) {
  const [isPending, startTransition] = useTransition()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const saved = (autoscuola.info as Record<string, string>) ?? {}
    return INFO_FIELDS.reduce((acc, f) => {
      acc[f.key] = saved[f.key] ?? ""
      return acc
    }, {} as Record<string, string>)
  })
  const [saved, setSaved] = useState(false)

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    startTransition(async () => {
      await updateAutoscuolaInfo(autoscuola.id, values)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="p-6">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-border-1 bg-surface-2 px-4 py-2.5 text-left text-[12px] font-semibold tracking-wider text-ink-500 uppercase">
              Parametro
            </th>
            <th className="border border-border-1 bg-surface-2 px-4 py-2.5 text-left text-[12px] font-semibold tracking-wider text-ink-500 uppercase">
              Dati Raccolti
            </th>
          </tr>
        </thead>
        <tbody>
          {INFO_FIELDS.map((field) => (
            <tr key={field.key}>
              <td className="border border-border-1 px-4 py-2.5 text-[13px] font-medium text-ink-900 align-top" style={{ width: "45%" }}>
                {field.label}
              </td>
              <td className="border border-border-1 p-0">
                <input
                  value={values[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder="Non specificato."
                  className="w-full bg-transparent px-4 py-2.5 text-[13px] text-ink-700 outline-none placeholder:text-ink-400 focus:bg-pink-50/30"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[999px] bg-pink px-5 py-2 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
        >
          {isPending ? "Salvataggio..." : "Salva informazioni"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[12px] font-medium text-green">
            <Check className="h-3.5 w-3.5" />
            Salvato
          </span>
        )}
      </div>
    </div>
  )
}

function FollowUpPicker({ autoscuolaId, initialDate }: { autoscuolaId: string; initialDate: Date | null }) {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(initialDate ? new Date(initialDate).toISOString().slice(0, 16) : "")
  const [showPicker, setShowPicker] = useState(false)

  const followUpDate = date ? new Date(date) : null
  const now = new Date()
  const isExpired = followUpDate && followUpDate < now
  const diffMs = followUpDate ? followUpDate.getTime() - now.getTime() : 0
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  function handleChange(value: string) {
    setDate(value)
    setShowPicker(false)
    startTransition(() => {
      setFollowUp(autoscuolaId, value || null)
    })
  }

  if (!date && !showPicker) {
    return (
      <button
        onClick={() => setShowPicker(true)}
        className="flex h-[38px] w-full cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-border-2 bg-surface-2/50 px-3 text-[13px] text-ink-400 transition-colors hover:border-pink hover:text-pink"
      >
        <Calendar className="h-3.5 w-3.5" />
        Programma un follow-up
      </button>
    )
  }

  return (
    <div>
      <div className="mb-2">
        <DateTimePicker
          value={date || new Date().toISOString().slice(0, 16)}
          onChange={(v) => handleChange(v)}
        />
      </div>
      {followUpDate && (
        <p className="text-[12px]" style={{ color: isExpired ? "#EF4444" : "#10B981" }}>
          {isExpired
            ? `Scaduto da ${Math.abs(diffDays)} giorn${Math.abs(diffDays) === 1 ? "o" : "i"}`
            : `Tra ${diffDays} giorn${diffDays === 1 ? "o" : "i"}`}
        </p>
      )}
      {date && (
        <button
          onClick={() => handleChange("")}
          disabled={isPending}
          className="mt-1 text-[11px] text-ink-400 hover:text-ink-600"
        >
          Rimuovi follow-up
        </button>
      )}
    </div>
  )
}
