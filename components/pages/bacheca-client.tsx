"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Pin, Calendar } from "lucide-react"
import { NEWS_CATEGORIES } from "@/lib/constants"
import type { News } from "@/lib/db/schema"

export function BachecaClient({ news }: { news: News[] }) {
  const router = useRouter()

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement
    const anchor = el.tagName === "A" ? el as HTMLAnchorElement : el.closest("a")
    if (!anchor) return
    const href = anchor.getAttribute("href")
    if (!href) return
    e.preventDefault()
    e.stopPropagation()
    if (href.startsWith("/")) {
      router.push(href)
    } else {
      window.open(href, "_blank", "noopener,noreferrer")
    }
  }, [router])
  const [selectedId, setSelectedId] = useState<number | null>(news[0]?.id ?? null)
  const [filter, setFilter] = useState<string | null>(null)

  const filtered = filter ? news.filter((n) => n.category === filter) : news
  const selected = news.find((n) => n.id === selectedId)

  return (
    <div className="grid h-[calc(100vh)] grid-cols-[360px_1fr]">
      {/* Left list */}
      <div className="flex flex-col border-r border-border-1 bg-surface">
        <div className="border-b border-border-1 p-4">
          <h2 className="mb-3 text-[16px] font-bold text-ink-900">Bacheca news</h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilter(null)}
              className="rounded-[999px] px-2.5 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: !filter ? "#EC4899" : "#F8FAFC",
                color: !filter ? "white" : "#64748B",
              }}
            >
              Tutti
            </button>
            {NEWS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className="rounded-[999px] px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: filter === cat.id ? cat.color : "#F8FAFC",
                  color: filter === cat.id ? "white" : "#64748B",
                }}
              >
                {cat.id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((item) => {
            const isSelected = item.id === selectedId
            const catColor =
              NEWS_CATEGORIES.find((c) => c.id === item.category)?.color ?? "#64748B"
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="flex w-full flex-col border-b border-border-2 px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? "#FDF2F8" : "transparent",
                  borderLeftWidth: 3,
                  borderLeftColor: isSelected ? "#EC4899" : "transparent",
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                    style={{
                      backgroundColor: catColor + "15",
                      color: catColor,
                    }}
                  >
                    {item.category}
                  </span>
                  {item.pinned && <Pin className="h-3 w-3 text-pink" />}
                </div>
                <p className="mb-0.5 text-[13px] font-semibold text-ink-900">{item.title}</p>
                {item.excerpt && (
                  <p className="line-clamp-2 text-[12px] text-ink-500">{item.excerpt}</p>
                )}
                <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400">
                  <Calendar className="h-3 w-3" />
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right reader */}
      <div className="flex-1 overflow-y-auto bg-surface p-8">
        {selected ? (
          <div className="mx-auto max-w-[680px]">
            <div className="mb-4">
              <span
                className="mb-2 inline-block rounded-[4px] px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                style={{
                  backgroundColor:
                    (NEWS_CATEGORIES.find((c) => c.id === selected.category)?.color ??
                      "#64748B") + "15",
                  color:
                    NEWS_CATEGORIES.find((c) => c.id === selected.category)?.color ?? "#64748B",
                }}
              >
                {selected.category}
              </span>
              <h1 className="mb-2 text-[24px] font-bold tracking-tight text-ink-900">
                {selected.title}
              </h1>
              <p className="text-[13px] text-ink-400">
                {selected.createdAt
                  ? new Date(selected.createdAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : ""}
              </p>
            </div>

            {selected.body && (
              <div
                onClick={handleContentClick}
                className="reglo-links prose prose-sm max-w-none text-[14px] leading-relaxed text-ink-700 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:mb-1 [&_ol]:my-3 [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: selected.body }}
              />
            )}

          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-ink-400">
            Seleziona un articolo dalla lista
          </div>
        )}
      </div>
    </div>
  )
}
