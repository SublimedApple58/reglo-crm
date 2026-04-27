"use client"

import { useState, useTransition, useCallback, useRef, useEffect } from "react"
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
  DollarSign,
  AlertTriangle,
  Copy,
  CheckSquare,
} from "lucide-react"
import { STAGES } from "@/lib/constants"
import { formatProvince } from "@/lib/utils"
import { updateAutoscuolaStage, updateAutoscuola, updateAutoscuolaInfo, createActivity, deleteAutoscuola, setFollowUp } from "@/lib/actions/autoscuole"
import { deleteDocument } from "@/lib/actions/documents"
import { createContractRequest, updateContractRequest, resubmitContractRequest, getContractFileUrl } from "@/lib/actions/contracts"
import { createGoogleTask } from "@/lib/actions/calendar"
import { MeetingDialog } from "@/components/meeting-dialog"
import { DateTimePicker } from "@/components/date-time-picker"
import type { Autoscuola, PipelineStage, User, Activity, Document, ContractRequest } from "@/lib/db/schema"

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

type ContractRequestWithRelations = {
  request: ContractRequest
  user: { id: string; name: string }
  autoscuola: { id: string; name: string }
} | null

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
  contractRequest,
  isAdmin = false,
  googleConnected = false,
}: {
  autoscuola: Autoscuola
  stage: PipelineStage
  salesUser: User | null
  activities: ActivityFlat[]
  stages: typeof STAGES extends readonly (infer T)[] ? T[] : never
  documents: DocumentWithUser[]
  contractRequest: ContractRequestWithRelations
  isAdmin?: boolean
  googleConnected?: boolean
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("attivita")
  const [currentStageId, setCurrentStageId] = useState(autoscuola.stageId)
  const [isPending, startTransition] = useTransition()
  const [activityText, setActivityText] = useState("")
  const [activityType, setActivityType] = useState<"call" | "email" | "meeting" | "note" | "task">("call")
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const now = new Date()
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  })
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
      if (activityType === "task") {
        // Create a Google Task + CRM activity with scheduledAt
        const dueISO = new Date(taskDueDate).toISOString()
        await createGoogleTask({
          title: activityText.trim(),
          notes: `Autoscuola: ${autoscuola.name}`,
          dueDate: dueISO,
        })
        await createActivity({
          autoscuolaId: autoscuola.id,
          type: "note",
          title: activityText.trim(),
          body: null,
          scheduledAt: dueISO,
        })
      } else {
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
      }
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
                  placeholder={activityType === "task" ? "Descrivi la task..." : "Registra un'attivita\u2026"}
                  className="mb-3 w-full resize-none rounded-[10px] border border-border-2 bg-surface-2 p-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink"
                  rows={3}
                />

                {/* Task date picker */}
                {activityType === "task" && (
                  <div className="mb-3">
                    <DateTimePicker
                      label="Scadenza"
                      value={taskDueDate}
                      onChange={(v) => setTaskDueDate(v)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {(
                      [
                        { type: "call" as const, icon: Phone, label: "Call log" },
                        { type: "email" as const, icon: Mail, label: "Email" },
                        { type: "meeting" as const, icon: Video, label: "Meeting" },
                        { type: "note" as const, icon: StickyNote, label: "Nota" },
                        { type: "task" as const, icon: CheckSquare, label: "Task" },
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
                    {activityType === "task" ? "Crea task" : "Registra"}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative pl-7">
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border-1" />
                {activities.map((a) => {
                  const isFuture = a.scheduledAt && new Date(a.scheduledAt) > new Date()
                  const isCancelled = a.status === "cancelled"

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
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleDateString("it-IT", {
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
                    {a.scheduledAt && (
                      <p className={`mt-0.5 flex items-center gap-1 text-[11.5px] ${isFuture && !isCancelled ? "text-blue-500" : "text-ink-400"}`}>
                        <Clock className="h-3 w-3" />
                        {new Date(a.scheduledAt).toLocaleDateString("it-IT", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
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
            <ContrattoTab
              autoscuolaId={autoscuola.id}
              contractRequest={contractRequest}
            />
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

        {/* Interessi */}
        <div className="border-b border-border-1 p-5">
          <h3 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
            Interessi
          </h3>
          <InteressiToggles
            autoscuolaId={autoscuola.id}
            initialQuiz={autoscuola.interesseQuiz}
            initialRinnovo={autoscuola.interesseRinnovo}
          />
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

const REGLO_COMPANY_DATA = {
  ragioneSociale: "–",
  partitaIva: "–",
  codiceFiscale: "–",
  codiceSDI: "–",
  indirizzo: "–",
  cap: "–",
  citta: "–",
  provincia: "–",
} as const

const REGLO_FIELDS = [
  { label: "Ragione sociale", key: "ragioneSociale" },
  { label: "Partita IVA", key: "partitaIva" },
  { label: "Codice fiscale", key: "codiceFiscale" },
  { label: "Codice SDI / PEC", key: "codiceSDI" },
  { label: "Indirizzo", key: "indirizzo" },
  { label: "CAP", key: "cap" },
  { label: "Citta", key: "citta" },
  { label: "Provincia", key: "provincia" },
] as const

const CONTRACT_SECTIONS = [
  {
    title: "Dati aziendali",
    icon: Building,
    fields: [
      { key: "ragioneSociale", label: "Ragione sociale", span: 2 },
      { key: "partitaIva", label: "Partita IVA", span: 1 },
      { key: "codiceFiscale", label: "Codice fiscale", span: 1 },
      { key: "pecEmail", label: "PEC", span: 1 },
      { key: "codiceSDI", label: "Codice SDI", span: 1 },
    ],
  },
  {
    title: "Indirizzo di fatturazione",
    icon: MapPin,
    cols: 3,
    fields: [
      { key: "indirizzoFatturazione", label: "Via e civico", span: 3 },
      { key: "cittaFatturazione", label: "Città", span: 1 },
      { key: "capFatturazione", label: "CAP", span: 1 },
      { key: "provinciaFatturazione", label: "Provincia", span: 1 },
    ],
  },
] as const

const ALL_CONTRACT_KEYS = CONTRACT_SECTIONS.flatMap((s) => s.fields.map((f) => f.key))

type ContractFormData = Record<(typeof ALL_CONTRACT_KEYS)[number], string>

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "In attesa", color: "#F59E0B", bg: "#FEF3C7", icon: Clock },
  in_progress: { label: "In lavorazione", color: "#3B82F6", bg: "#DBEAFE", icon: Clock },
  done: { label: "Completato", color: "#10B981", bg: "#D1FAE5", icon: Check },
  rejected: { label: "Rimandato", color: "#EF4444", bg: "#FEE2E2", icon: AlertTriangle },
}

function ContrattoTab({
  autoscuolaId,
  contractRequest,
}: {
  autoscuolaId: string
  contractRequest: ContractRequestWithRelations
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [isResubmit, setIsResubmit] = useState(false)
  const [form, setForm] = useState<ContractFormData & { notes: string; importoPreventivo: string; descrizioneServizio: string }>(() => {
    const r = contractRequest?.request
    return {
      ragioneSociale: r?.ragioneSociale ?? "",
      partitaIva: r?.partitaIva ?? "",
      codiceFiscale: r?.codiceFiscale ?? "",
      pecEmail: r?.pecEmail ?? "",
      codiceSDI: r?.codiceSDI ?? "",
      indirizzoFatturazione: r?.indirizzoFatturazione ?? "",
      capFatturazione: r?.capFatturazione ?? "",
      cittaFatturazione: r?.cittaFatturazione ?? "",
      provinciaFatturazione: r?.provinciaFatturazione ?? "",
      notes: r?.notes ?? "",
      importoPreventivo: r?.importoPreventivo != null ? String(r.importoPreventivo) : "",
      descrizioneServizio: r?.descrizioneServizio ?? "",
    }
  })

  function handleSubmit() {
    const payload = {
      ...form,
      importoPreventivo: form.importoPreventivo ? parseFloat(form.importoPreventivo) : undefined,
      descrizioneServizio: form.descrizioneServizio || undefined,
    }

    startTransition(async () => {
      if (isResubmit && contractRequest) {
        await resubmitContractRequest(contractRequest.request.id, payload)
        setEditing(false)
        setIsResubmit(false)
      } else if (contractRequest && editing) {
        await updateContractRequest(contractRequest.request.id, payload)
        setEditing(false)
      } else {
        await createContractRequest({ autoscuolaId, ...payload })
      }
      router.refresh()
    })
  }

  // State: no request yet OR editing → show form
  if (!contractRequest || editing) {
    return (
      <div>
        {editing && (
          <button
            onClick={() => { setEditing(false); setIsResubmit(false) }}
            className="mb-4 flex items-center gap-1 text-[12.5px] font-medium text-ink-500 transition-colors hover:text-ink-700"
          >
            <span className="text-[14px]">&larr;</span> Torna al riepilogo
          </button>
        )}

        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-pink/10">
              <FileText className="h-4 w-4 text-pink" />
            </div>
            <h3 className="text-[17px] font-bold text-ink-900">
              {isResubmit ? "Correggi e reinvia" : editing ? "Correggi dati fiscali" : "Richiesta contratto"}
            </h3>
          </div>
          <p className="ml-[42px] text-[13px] text-ink-500">
            {isResubmit
              ? "Correggi i dati e reinvia la richiesta all'admin."
              : "Compila i dati fiscali dell'autoscuola per richiedere la generazione del contratto."}
          </p>
        </div>

        {/* Da inviare al cliente — dati Reglo */}
        <div className="mb-5 rounded-[14px] border border-border-1 bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-[15px] font-bold text-ink-900">Da inviare al cliente</h4>
            <button
              type="button"
              onClick={() => {
                const text = `RICHIESTA DATI FATTURA\n\n${REGLO_FIELDS.map((f) => `${f.label}: ${REGLO_COMPANY_DATA[f.key]}`).join("\n")}`
                navigator.clipboard.writeText(text)
              }}
              className="flex items-center gap-1.5 rounded-[999px] border border-pink/30 px-3 py-1.5 text-[12px] font-semibold text-pink transition-colors hover:bg-pink/5"
            >
              <Copy className="h-3 w-3" />
              Copia testo
            </button>
          </div>
          <div className="rounded-[10px] border border-border-2 bg-surface-2/40 p-4">
            <p className="mb-3 text-[12.5px] font-bold tracking-wide text-ink-700 uppercase">
              Richiesta dati fattura
            </p>
            <div className="space-y-1.5">
              {REGLO_FIELDS.map((f) => (
                <div key={f.key} className="flex items-baseline gap-2 text-[13px]">
                  <span className="text-ink-500">{f.label}:</span>
                  <span className="font-medium text-ink-900">{REGLO_COMPANY_DATA[f.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Dettagli preventivo section */}
          <div className="rounded-[14px] border border-border-1 bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-ink-400" />
              <h4 className="text-[12.5px] font-semibold tracking-wide text-ink-500 uppercase">
                Dettagli preventivo
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-600">
                  Importo preventivo (&euro;)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.importoPreventivo}
                  onChange={(e) => setForm({ ...form, importoPreventivo: e.target.value })}
                  placeholder="0.00"
                  className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface-2/50 px-3 text-[13px] text-ink-900 outline-none transition-colors focus:border-pink focus:bg-white focus:ring-2 focus:ring-pink/20"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-[12px] font-medium text-ink-600">
                  Descrizione servizio offerto
                </label>
                <textarea
                  value={form.descrizioneServizio}
                  onChange={(e) => setForm({ ...form, descrizioneServizio: e.target.value })}
                  placeholder="Descrivi brevemente il servizio offerto..."
                  className="w-full resize-none rounded-[10px] border border-border-1 bg-surface-2/50 p-3 text-[13px] text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-pink focus:bg-white focus:ring-2 focus:ring-pink/20"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {CONTRACT_SECTIONS.map((section) => {
            const SectionIcon = section.icon
            return (
              <div key={section.title} className="rounded-[14px] border border-border-1 bg-surface p-5">
                <div className="mb-4 flex items-center gap-2">
                  <SectionIcon className="h-4 w-4 text-ink-400" />
                  <h4 className="text-[12.5px] font-semibold tracking-wide text-ink-500 uppercase">
                    {section.title}
                  </h4>
                </div>
                <div className={`grid gap-3 ${("cols" in section && section.cols === 3) ? "grid-cols-3" : "grid-cols-2"}`}>
                  {section.fields.map((field) => (
                    <div key={field.key} className={field.span >= 3 ? "col-span-3" : field.span === 2 ? "col-span-2" : ""}>
                      <label className="mb-1.5 block text-[12px] font-medium text-ink-600">
                        {field.label}
                      </label>
                      <input
                        value={form[field.key as keyof ContractFormData]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface-2/50 px-3 text-[13px] text-ink-900 outline-none transition-colors focus:border-pink focus:bg-white focus:ring-2 focus:ring-pink/20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Notes */}
          <div className="rounded-[14px] border border-border-1 bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-ink-400" />
              <h4 className="text-[12.5px] font-semibold tracking-wide text-ink-500 uppercase">
                Note aggiuntive
              </h4>
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Note per l'admin (facoltativo)..."
              className="w-full resize-none rounded-[10px] border border-border-1 bg-surface-2/50 p-3 text-[13px] text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-pink focus:bg-white focus:ring-2 focus:ring-pink/20"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 rounded-[999px] bg-pink px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isPending
              ? "Invio in corso..."
              : isResubmit
              ? "Correggi e reinvia"
              : editing
              ? "Salva modifiche"
              : "Invia richiesta"}
          </button>
          {(editing || isResubmit) && (
            <button
              onClick={() => { setEditing(false); setIsResubmit(false) }}
              className="rounded-[999px] border border-border-1 px-5 py-2.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-surface-2"
            >
              Annulla
            </button>
          )}
        </div>
      </div>
    )
  }

  // State: request exists → show status + summary
  const req = contractRequest.request
  const statusInfo = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending

  if (req.status === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-5">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-green-200">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-sm">
            <Check className="h-3 w-3 text-white" />
          </div>
        </div>
        <h3 className="mb-1.5 text-[18px] font-bold text-ink-900">Contratto completato</h3>
        <p className="max-w-[320px] text-[13px] leading-relaxed text-ink-500">
          La richiesta contratto è stata elaborata con successo dall&apos;admin.
        </p>
        <p className="mt-3 text-[12px] text-ink-400">
          Completato il{" "}
          {new Date(req.updatedAt).toLocaleDateString("it-IT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {/* Download links for uploaded PDFs */}
        {(req.contractPdfKey || req.invoicePdfKey) && (
          <div className="mt-6 space-y-2">
            {req.contractPdfKey && (
              <ContractDownloadLink
                label="Contratto Firmato"
                fileName={req.contractPdfName ?? "contratto.pdf"}
                fileKey={req.contractPdfKey}
              />
            )}
            {req.invoicePdfKey && (
              <ContractDownloadLink
                label="Fattura Emessa"
                fileName={req.invoicePdfName ?? "fattura.pdf"}
                fileKey={req.invoicePdfKey}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  // Rejected state
  if (req.status === "rejected") {
    return (
      <div>
        {/* Status header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-ink-900">Richiesta rimandato</h3>
              <p className="text-[12px] text-ink-400">
                La richiesta è stata rimandato indietro dall&apos;admin
              </p>
            </div>
          </div>
          <span
            className="flex items-center gap-1.5 rounded-[999px] px-3 py-1.5 text-[11.5px] font-semibold"
            style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusInfo.color }}
            />
            {statusInfo.label}
          </span>
        </div>

        {/* Progress bar showing rejected state */}
        <div className="mb-6 flex gap-1.5">
          {(["pending", "rejected"] as const).map((step) => {
            const info = STATUS_LABELS[step]
            return (
              <div key={step} className="flex-1">
                <div
                  className="mb-1.5 h-[3px] rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                <p className="text-[10.5px] font-medium" style={{ color: info.color }}>
                  {info.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Rejection reason alert */}
        {req.rejectionReason && (
          <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="mb-0.5 text-[12.5px] font-semibold text-red-700">Motivo del rifiuto</p>
                <p className="text-[13px] leading-relaxed text-red-600">{req.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fiscal data sections (read-only summary) */}
        <div className="space-y-4">
          {CONTRACT_SECTIONS.map((section) => {
            const SectionIcon = section.icon
            const hasData = section.fields.some((f) => req[f.key as keyof typeof req])
            if (!hasData) return null
            return (
              <div key={section.title} className="rounded-[14px] border border-border-1 bg-surface-2/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <SectionIcon className="h-3.5 w-3.5 text-ink-400" />
                  <h4 className="text-[11.5px] font-semibold tracking-wider text-ink-400 uppercase">
                    {section.title}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {section.fields.map((field) => {
                    const value = req[field.key as keyof typeof req] as string | null
                    if (!value) return null
                    return (
                      <div key={field.key} className={`flex justify-between py-1 text-[13px] ${field.span === 2 ? "col-span-2" : ""}`}>
                        <span className="text-ink-500">{field.label}</span>
                        <span className="font-medium text-ink-900">{value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => {
            setEditing(true)
            setIsResubmit(true)
            // Reset form with current values
            setForm({
              ragioneSociale: req.ragioneSociale ?? "",
              partitaIva: req.partitaIva ?? "",
              codiceFiscale: req.codiceFiscale ?? "",
              pecEmail: req.pecEmail ?? "",
              codiceSDI: req.codiceSDI ?? "",
              indirizzoFatturazione: req.indirizzoFatturazione ?? "",
              capFatturazione: req.capFatturazione ?? "",
              cittaFatturazione: req.cittaFatturazione ?? "",
              provinciaFatturazione: req.provinciaFatturazione ?? "",
              notes: req.notes ?? "",
              importoPreventivo: req.importoPreventivo != null ? String(req.importoPreventivo) : "",
              descrizioneServizio: req.descrizioneServizio ?? "",
            })
          }}
          className="mt-5 flex items-center gap-2 rounded-[999px] bg-pink px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-pink/90"
        >
          <Send className="h-3.5 w-3.5" />
          Correggi e reinvia
        </button>
      </div>
    )
  }

  // Pending / In progress → summary view
  return (
    <div>
      {/* Status header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pink/10">
            <FileText className="h-5 w-5 text-pink" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-ink-900">Richiesta contratto</h3>
            <p className="text-[12px] text-ink-400">
              Inviata il{" "}
              {new Date(req.createdAt).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {contractRequest.user ? ` da ${contractRequest.user.name}` : ""}
            </p>
          </div>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-[999px] px-3 py-1.5 text-[11.5px] font-semibold"
          style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusInfo.color }}
          />
          {statusInfo.label}
        </span>
      </div>

      {/* Status progress bar */}
      <div className="mb-6 flex gap-1.5">
        {(["pending", "in_progress", "done"] as const).map((step) => {
          const stepOrder = { pending: 0, in_progress: 1, done: 2 }
          const currentOrder = stepOrder[req.status as keyof typeof stepOrder] ?? 0
          const thisOrder = stepOrder[step]
          const isActive = thisOrder <= currentOrder
          const info = STATUS_LABELS[step]
          return (
            <div key={step} className="flex-1">
              <div
                className="mb-1.5 h-[3px] rounded-full transition-colors"
                style={{ backgroundColor: isActive ? info.color : "#E2E8F0" }}
              />
              <p className="text-[10.5px] font-medium" style={{ color: isActive ? info.color : "#94A3B8" }}>
                {info.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Importo + descrizione servizio */}
      {(req.importoPreventivo || req.descrizioneServizio) && (
        <div className="mb-4 rounded-[14px] border border-amber-200/60 bg-amber-50/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-amber-600" />
            <h4 className="text-[11.5px] font-semibold tracking-wider text-amber-600 uppercase">
              Dettagli preventivo
            </h4>
          </div>
          <div className="space-y-1.5">
            {req.importoPreventivo != null && (
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-500">Importo</span>
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

      {/* Fiscal data sections */}
      <div className="space-y-4">
        {CONTRACT_SECTIONS.map((section) => {
          const SectionIcon = section.icon
          const hasData = section.fields.some((f) => req[f.key as keyof typeof req])
          if (!hasData) return null
          return (
            <div key={section.title} className="rounded-[14px] border border-border-1 bg-surface-2/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <SectionIcon className="h-3.5 w-3.5 text-ink-400" />
                <h4 className="text-[11.5px] font-semibold tracking-wider text-ink-400 uppercase">
                  {section.title}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {section.fields.map((field) => {
                  const value = req[field.key as keyof typeof req] as string | null
                  if (!value) return null
                  return (
                    <div key={field.key} className={`flex justify-between py-1 text-[13px] ${field.span === 2 ? "col-span-2" : ""}`}>
                      <span className="text-ink-500">{field.label}</span>
                      <span className="font-medium text-ink-900">{value}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {req.notes && (
          <div className="rounded-[14px] border border-border-1 bg-surface-2/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5 text-ink-400" />
              <h4 className="text-[11.5px] font-semibold tracking-wider text-ink-400 uppercase">
                Note
              </h4>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-700">{req.notes}</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setEditing(true)}
        className="mt-5 flex items-center gap-2 rounded-[999px] border border-border-1 px-5 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:border-pink hover:bg-pink/5 hover:text-pink"
      >
        <FileText className="h-3.5 w-3.5" />
        Correggi dati
      </button>
    </div>
  )
}

function ContractDownloadLink({
  label,
  fileName,
  fileKey,
}: {
  label: string
  fileName: string
  fileKey: string
}) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const url = await getContractFileUrl(fileKey)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      a.click()
    } catch {
      alert("Errore nel download del file")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-2 rounded-[10px] border border-border-1 bg-surface px-4 py-2.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-surface-2 disabled:opacity-50"
    >
      <Download className="h-4 w-4 text-ink-400" />
      <span>{label}</span>
      <span className="text-[11.5px] text-ink-400">({fileName})</span>
    </button>
  )
}

function InteressiToggles({
  autoscuolaId,
  initialQuiz,
  initialRinnovo,
}: {
  autoscuolaId: string
  initialQuiz: boolean | null
  initialRinnovo: boolean | null
}) {
  const [isPending, startTransition] = useTransition()
  const [quiz, setQuiz] = useState(initialQuiz ?? false)
  const [rinnovo, setRinnovo] = useState(initialRinnovo ?? false)

  function toggle(field: "interesseQuiz" | "interesseRinnovo") {
    const next = field === "interesseQuiz" ? !quiz : !rinnovo
    if (field === "interesseQuiz") setQuiz(next)
    else setRinnovo(next)
    startTransition(() => {
      updateAutoscuola(autoscuolaId, { [field]: next })
    })
  }

  const items = [
    { label: "Quiz patente", value: quiz, field: "interesseQuiz" as const },
    { label: "Rinnovo patenti", value: rinnovo, field: "interesseRinnovo" as const },
  ]

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <button
          key={item.field}
          onClick={() => toggle(item.field)}
          disabled={isPending}
          className="flex w-full cursor-pointer items-center justify-between rounded-[10px] border border-border-1 px-3 py-2.5 transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          <span className="text-[13px] font-medium text-ink-700">{item.label}</span>
          <div
            className="flex h-[22px] w-[40px] items-center rounded-full p-[2px] transition-colors"
            style={{ backgroundColor: item.value ? "#EC4899" : "#E2E8F0" }}
          >
            <div
              className="h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform"
              style={{ transform: item.value ? "translateX(18px)" : "translateX(0)" }}
            />
          </div>
        </button>
      ))}
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

  // Ref to programmatically click the DateTimePicker button
  const pickerBtnRef = useRef<HTMLDivElement>(null)

  // When showPicker becomes true, auto-open the DateTimePicker calendar
  useEffect(() => {
    if (showPicker && !date) {
      setTimeout(() => {
        const btn = pickerBtnRef.current?.querySelector("button")
        btn?.click()
      }, 50)
    }
  }, [showPicker, date])

  // If picker is showing but no date is set, detect when the calendar dropdown closes
  // (click outside) and reset showPicker back to false
  useEffect(() => {
    if (!showPicker || date) return
    function checkClosed() {
      const dropdown = pickerBtnRef.current?.querySelector(".absolute")
      if (!dropdown) setShowPicker(false)
    }
    // Poll briefly after interactions to detect the dropdown disappearing
    function handleClick() { setTimeout(checkClosed, 100) }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showPicker, date])

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
      <div className="mb-2" ref={pickerBtnRef}>
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
