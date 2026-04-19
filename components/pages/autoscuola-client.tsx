"use client"

import { useState, useTransition } from "react"
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
  Lightbulb,
} from "lucide-react"
import { STAGES } from "@/lib/constants"
import { updateAutoscuolaStage, updateAutoscuola, createActivity } from "@/lib/actions/autoscuole"
import type { Autoscuola, PipelineStage, User, Activity } from "@/lib/db/schema"

type ActivityFlat = Activity & {
  userName: string
  userColor: string
  userInitials: string
}

export function AutoscuolaClient({
  autoscuola,
  stage,
  salesUser,
  activities,
  stages,
}: {
  autoscuola: Autoscuola
  stage: PipelineStage
  salesUser: User | null
  activities: ActivityFlat[]
  stages: typeof STAGES extends readonly (infer T)[] ? T[] : never
}) {
  const [activeTab, setActiveTab] = useState("attivita")
  const [currentStageId, setCurrentStageId] = useState(autoscuola.stageId)
  const [isPending, startTransition] = useTransition()
  const [activityText, setActivityText] = useState("")
  const [activityType, setActivityType] = useState<"call" | "email" | "meeting" | "note">("call")

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

  const tabs = [
    { id: "attivita", label: "Attività" },
    { id: "anagrafica", label: "Anagrafica" },
    { id: "documenti", label: "Documenti" },
    { id: "contratto", label: "Contratto" },
    { id: "note", label: "Note" },
  ]

  return (
    <div className="grid h-[calc(100vh-52px)] grid-cols-[1fr_340px]">
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
                {autoscuola.town}, {autoscuola.province}
                <span className="mx-1 text-ink-300">·</span>
                <Users className="h-3 w-3" />
                {autoscuola.students} allievi
                <span className="mx-1 text-ink-300">·</span>
                <span className="font-mono text-ink-400">{autoscuola.id}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 hover:bg-surface-2">
                <Phone className="h-3.5 w-3.5" />
                Chiama
              </button>
              <button className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 hover:bg-surface-2">
                <Mail className="h-3.5 w-3.5" />
                Email
              </button>
              <button className="flex h-8 items-center gap-1.5 rounded-[999px] bg-pink px-3 text-[12px] font-semibold text-white hover:bg-pink/90">
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
                {activities.map((a) => (
                  <div key={a.id} className="relative mb-5 pl-5">
                    <div
                      className="absolute left-[-16px] top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border bg-white"
                      style={{ borderColor: a.userColor + "40" }}
                    >
                      {a.type === "call" ? (
                        <Phone className="h-3 w-3" style={{ color: a.userColor }} />
                      ) : a.type === "email" ? (
                        <Mail className="h-3 w-3" style={{ color: a.userColor }} />
                      ) : a.type === "meeting" ? (
                        <Video className="h-3 w-3" style={{ color: a.userColor }} />
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
                    <p className="text-[13px] font-semibold text-ink-900">{a.title}</p>
                    {a.body && (
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-600">
                        {a.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "anagrafica" && (
            <AnagraficaTab autoscuola={autoscuola} />
          )}

          {activeTab === "documenti" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-3 h-12 w-12 text-ink-300" />
              <p className="text-[14px] font-medium text-ink-500">Nessun documento caricato</p>
              <p className="text-[12.5px] text-ink-400">
                Carica contratti, preventivi e altri file
              </p>
            </div>
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
              <div className="flex items-center gap-2.5 text-[13px]">
                <Phone className="h-3.5 w-3.5 text-ink-400" />
                <span className="text-ink-700">{autoscuola.phone}</span>
              </div>
            )}
            {autoscuola.email && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Mail className="h-3.5 w-3.5 text-ink-400" />
                <span className="text-ink-700">{autoscuola.email}</span>
              </div>
            )}
            {autoscuola.address && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <MapPin className="h-3.5 w-3.5 text-ink-400" />
                <span className="text-ink-700">{autoscuola.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sales owner */}
        {salesUser && (
          <div className="border-b border-border-1 p-5">
            <h3 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
              Sales Owner
            </h3>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: salesUser.color }}
              >
                {salesUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink-900">{salesUser.name}</p>
                <p className="text-[11.5px] text-ink-400">{salesUser.territory}</p>
              </div>
            </div>
          </div>
        )}

        {/* Deal info */}
        <div className="border-b border-border-1 p-5">
          <h3 className="mb-3 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
            Deal
          </h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Pacchetto</span>
              <span className="font-medium text-ink-900">Professional</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Valore</span>
              <span className="font-mono font-semibold text-ink-900">
                €{autoscuola.pipelineValue?.toLocaleString("it-IT") ?? "–"}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Commissione</span>
              <span className="font-mono font-medium text-green">
                €{Math.round((autoscuola.pipelineValue ?? 0) * 0.15).toLocaleString("it-IT")}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-500">Prob. chiusura</span>
              <span className="font-medium text-ink-900">65%</span>
            </div>
          </div>
        </div>

        {/* Script suggerito */}
        <div className="p-5">
          <div className="rounded-[12px] border border-[#FDE68A] bg-yellow-50 p-3.5">
            <div className="mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-[#B45309]" />
              <span className="text-[10px] font-bold tracking-wider text-[#B45309] uppercase">
                Script suggerito
              </span>
            </div>
            <p className="text-[11.5px] leading-[1.5] text-[#7C2D12]">
              Per lo stage &quot;{stage.label}&quot;, usa lo script di follow-up. Menziona il
              risparmio di 15 ore/settimana e chiedi disponibilità per una demo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnagraficaTab({ autoscuola }: { autoscuola: Autoscuola }) {
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
      <button
        onClick={handleSave}
        disabled={isPending}
        className="mt-2 rounded-[999px] bg-pink px-5 py-2 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
      >
        Salva modifiche
      </button>
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
