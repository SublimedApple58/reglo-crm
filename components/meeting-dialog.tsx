"use client"

import { useState, useTransition } from "react"
import { X, Video } from "lucide-react"
import { GoogleConnectCard } from "@/components/google-connect-card"
import {
  EventFormFields,
  useEventForm,
  type EventFormAutoscuola,
  type EventFormSalesUser,
} from "@/components/event-form-fields"

type MeetingDialogProps = {
  onClose: () => void
  onCreated?: (result: { meetLink: string | null; htmlLink: string } | { followUp: true }) => void
  lockedAutoscuola?: EventFormAutoscuola | null
  salesUsers?: EventFormSalesUser[]
  currentUserName?: string
  defaultStart?: string
  defaultEnd?: string
  googleConnected?: boolean
}

// Shell modale attorno a EventFormFields — stessi campi/comportamento del form del Calendario.
export function MeetingDialog({
  onClose,
  onCreated,
  lockedAutoscuola = null,
  salesUsers = [],
  currentUserName,
  defaultStart,
  defaultEnd,
  googleConnected = true,
}: MeetingDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ meetLink: string | null; htmlLink: string } | null>(null)
  const [error, setError] = useState("")

  const form = useEventForm({ lockedAutoscuola, defaultStart, defaultEnd })

  function handleSubmit() {
    if (!form.canSubmit || isPending) return
    setError("")

    startTransition(async () => {
      try {
        const res = await form.submit()
        if (res.kind === "followup") {
          onCreated?.({ followUp: true })
          onClose()
          return
        }
        setResult(res)
        onCreated?.(res)
      } catch {
        setError("Errore nella creazione dell'evento. Riprova.")
      }
    })
  }

  if (!googleConnected) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-[460px]" onClick={(e) => e.stopPropagation()}>
          <GoogleConnectCard callbackUrl={lockedAutoscuola ? `/autoscuola/${lockedAutoscuola.id}` : "/calendario"} />
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-[420px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green/10">
            <Video className="h-6 w-6 text-green" />
          </div>
          <h2 className="mb-1 text-[18px] font-bold text-ink-900">Evento creato!</h2>
          <p className="mb-4 text-[13px] text-ink-500">L&apos;evento è stato aggiunto al tuo Google Calendar.</p>

          {result.meetLink && (
            <div className="mb-4 rounded-[10px] bg-surface-2 p-3">
              <p className="mb-1 text-[11.5px] font-semibold text-ink-400">Link Google Meet</p>
              <a
                href={result.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[13px] font-medium text-brand hover:underline"
              >
                {result.meetLink}
              </a>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <a
              href={result.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
            >
              Apri in Google Calendar
            </a>
            <button
              onClick={onClose}
              className="h-9 rounded-[999px] bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand/90"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[90vh] w-[480px] overflow-y-auto rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">Nuovo meeting</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-surface-2 hover:text-ink-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <EventFormFields
          form={form}
          salesUsers={salesUsers}
          currentUserName={currentUserName}
          onSubmit={handleSubmit}
        />

        {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.canSubmit || isPending}
            className="flex h-9 items-center gap-1.5 rounded-[999px] bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {isPending ? "Creazione..." : form.isFollowUp ? "Crea follow-up" : "Crea evento"}
          </button>
        </div>
      </div>
    </div>
  )
}
