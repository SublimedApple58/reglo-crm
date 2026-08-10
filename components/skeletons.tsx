import { Skeleton } from "@/components/ui/skeleton"

// Skeleton di caricamento per le route della dashboard.
// Rispecchiano il layout reale di ogni pagina per evitare salti (layout shift)
// e dare feedback immediato durante la navigazione dalla sidebar.

function Line({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-3.5 ${className}`} />
}

// ── Pipeline (toolbar + colonne Kanban) ──────────────────────────────
export function PipelineSkeleton() {
  return (
    <div className="flex h-screen max-w-full flex-col">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border-1 bg-surface px-4 py-3">
        <Skeleton className="h-8 w-[220px] rounded-[999px]" />
        <Skeleton className="h-8 w-24 rounded-[999px]" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-[999px]" />
          <Skeleton className="h-8 w-28 rounded-[999px]" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-[300px] shrink-0 flex-col gap-2">
            <Skeleton className="h-8 w-full rounded-[10px]" />
            {Array.from({ length: 4 - (i % 3) }).map((_, j) => (
              <Skeleton key={j} className="h-[92px] w-full rounded-[14px]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mappa (pannello sinistro + area mappa) ───────────────────────────
export function MapSkeleton() {
  return (
    <div className="grid h-screen grid-cols-[320px_1fr] overflow-hidden">
      <div className="flex min-h-0 flex-col border-r border-border-1 bg-surface">
        <div className="border-b border-border-1 p-4">
          <Skeleton className="mb-2 h-4 w-40" />
          <Skeleton className="mb-3 h-3 w-56" />
          <Skeleton className="h-8 w-full rounded-[999px]" />
        </div>
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-[12px]" />
          ))}
        </div>
      </div>
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  )
}

// ── Home (dashboard: intestazione + card + widget) ───────────────────
export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-[1320px] px-9 pt-7 pb-[60px]">
      <Skeleton className="mb-2 h-9 w-80" />
      <Skeleton className="mb-8 h-4 w-[420px]" />
      <div className="mb-8 grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[18px]" />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="overflow-hidden rounded-[18px] border border-border-1 bg-surface">
            <div className="border-b border-border-1 px-5 py-3.5">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex flex-col gap-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1">
                    <Line className="mb-1.5 w-2/3" />
                    <Line className="w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Lista centrata (Attività) ────────────────────────────────────────
export function ListSkeleton() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      <Skeleton className="mb-1 h-6 w-48" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[14px] border border-border-1 p-3.5">
            <Skeleton className="h-[18px] w-[18px] shrink-0 rounded-full" />
            <div className="flex-1">
              <Line className="mb-1.5 w-1/2" />
              <Line className="w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Split list + dettaglio (Bacheca) ─────────────────────────────────
export function SplitListSkeleton() {
  return (
    <div className="grid h-[calc(100vh)] grid-cols-[360px_1fr]">
      <div className="flex flex-col border-r border-border-1 bg-surface">
        <div className="border-b border-border-1 p-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
          ))}
        </div>
      </div>
      <div className="px-8 py-7">
        <Skeleton className="mb-3 h-7 w-2/3" />
        <Skeleton className="mb-6 h-4 w-40" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Line key={i} className={i % 3 === 2 ? "w-1/2" : "w-full"} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tre colonne (Risorse) ────────────────────────────────────────────
export function ThreeColSkeleton() {
  return (
    <div className="grid h-[calc(100vh)] grid-cols-[230px_360px_1fr]">
      <div className="flex flex-col gap-2 border-r border-border-1 bg-bg p-3">
        <Skeleton className="mb-2 h-3 w-24" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-[10px]" />
        ))}
      </div>
      <div className="flex flex-col gap-2 border-r border-border-1 p-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
        ))}
      </div>
      <div className="px-8 py-7">
        <Skeleton className="mb-3 h-7 w-2/3" />
        <Skeleton className="mb-6 h-4 w-40" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Line key={i} className={i % 3 === 2 ? "w-1/2" : "w-full"} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Calendario (toolbar + griglia + sidebar) ─────────────────────────
export function CalendarSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-1 px-5 py-3">
        <Skeleton className="h-7 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-[999px]" />
          <Skeleton className="h-8 w-32 rounded-[999px]" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_260px]">
        <div className="p-4">
          <Skeleton className="h-full w-full rounded-[14px]" />
        </div>
        <div className="flex flex-col gap-2 border-l border-border-1 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-[10px]" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Stat + tabella (Commissioni) ─────────────────────────────────────
export function StatsTableSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Skeleton className="mb-1 h-6 w-48" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="mb-5 grid grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-[18px]" />
        <Skeleton className="h-32 rounded-[18px]" />
      </div>
      <TableRows />
    </div>
  )
}

// ── Form (Profilo) ───────────────────────────────────────────────────
export function FormSkeleton() {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      <Skeleton className="mb-6 h-6 w-40" />
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1">
          <Line className="mb-2 w-40" />
          <Line className="w-56" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-1.5 h-3 w-24" />
            <Skeleton className="h-[38px] w-full rounded-[10px]" />
          </div>
        ))}
        <Skeleton className="mt-2 h-9 w-40 rounded-[999px]" />
      </div>
    </div>
  )
}

// ── Dettaglio autoscuola (main + sidebar destra) ─────────────────────
export function DetailSkeleton() {
  return (
    <div className="grid h-[calc(100vh)] grid-cols-[1fr_340px]">
      <div className="flex flex-col overflow-hidden">
        <div className="border-b border-border-1 px-7 py-5">
          <Skeleton className="mb-3 h-4 w-32" />
          <Skeleton className="mb-2 h-7 w-2/3" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-6 border-b border-border-1 px-7 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <div className="flex flex-col gap-5 p-7">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-[22px] w-[22px] shrink-0 rounded-full" />
              <div className="flex-1">
                <Line className="mb-1.5 w-40" />
                <Line className="mb-1.5 w-1/2" />
                <Line className="w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5 border-l border-border-1 bg-surface p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-3 h-3 w-24" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tabella admin (intestazione + righe) ─────────────────────────────
function TableRows() {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border-1">
      <div className="border-b border-border-1 bg-surface-2 px-5 py-3">
        <Skeleton className="h-3 w-full max-w-[520px]" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border-1 px-5 py-4 last:border-0">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1">
            <Line className="mb-1.5 w-48" />
            <Line className="w-56" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-16 rounded-[999px]" />
        </div>
      ))}
    </div>
  )
}

export function AdminTableSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="mb-1 h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-[999px]" />
      </div>
      <TableRows />
    </div>
  )
}
