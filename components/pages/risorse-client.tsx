"use client"

import { useState } from "react"
import {
  Phone,
  Mail,
  Shield,
  FileText,
  BookOpen,
  Search,
  Pin,
  Calendar,
} from "lucide-react"
import { RESOURCE_CATEGORIES } from "@/lib/constants"
import type { Resource } from "@/lib/db/schema"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  phone: Phone,
  mail: Mail,
  shield: Shield,
  "file-text": FileText,
  "book-open": BookOpen,
}

export function RisorseClient({ resources }: { resources: Resource[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(resources[0]?.id ?? null)
  const [search, setSearch] = useState("")

  const filteredDocs = resources.filter((r) => {
    if (selectedCategory && r.category !== selectedCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q) || (r.excerpt?.toLowerCase().includes(q) ?? false)
    }
    return true
  })

  const selected = resources.find((r) => r.id === selectedId)

  return (
    <div className="grid h-[calc(100vh-52px)] grid-cols-[230px_360px_1fr]">
      {/* Categories */}
      <div className="flex flex-col border-r border-border-1 bg-bg p-3">
        <h3 className="mb-3 px-2 text-[12px] font-semibold tracking-wider text-ink-400 uppercase">
          Categorie
        </h3>
        {RESOURCE_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] ?? FileText
          const isActive = selectedCategory === cat.label
          const count = resources.filter((r) => r.category === cat.label).length

          return (
            <button
              key={cat.id}
              onClick={() =>
                setSelectedCategory(isActive ? null : cat.label)
              }
              className="flex items-center gap-2.5 rounded-[999px] px-3 py-2 text-left text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "#FDF2F8" : "transparent",
                color: isActive ? "#EC4899" : "#1E293B",
              }}
            >
              <span style={{ color: cat.color }}><Icon className="h-4 w-4 shrink-0" /></span>
              <span className="flex-1 truncate">{cat.label}</span>
              <span className="font-mono text-[10.5px] text-ink-400">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Docs list */}
      <div className="flex flex-col border-r border-border-1 bg-surface">
        <div className="border-b border-border-1 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca risorsa…"
              className="h-8 w-full rounded-[999px] border border-border-1 pl-8 pr-3 text-[12.5px] outline-none placeholder:text-ink-400 focus:border-pink"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredDocs.map((doc) => {
            const Icon = ICON_MAP[doc.icon ?? ""] ?? FileText
            const isSelected = doc.id === selectedId

            return (
              <button
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className="flex w-full items-start gap-3 border-b border-border-2 px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? "#FDF2F8" : "transparent",
                  borderLeftWidth: 3,
                  borderLeftColor: isSelected ? "#EC4899" : "transparent",
                }}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: (doc.color ?? "#64748B") + "15" }}
                >
                  <span style={{ color: doc.color ?? "#64748B" }}><Icon className="h-4 w-4" /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{doc.title}</p>
                    {doc.pinned && <Pin className="h-3 w-3 shrink-0 text-pink" />}
                  </div>
                  {doc.excerpt && (
                    <p className="mb-1.5 line-clamp-2 text-[12px] text-ink-500">{doc.excerpt}</p>
                  )}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[4px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reader */}
      <div className="flex-1 overflow-y-auto bg-surface p-8">
        {selected ? (
          <div className="mx-auto max-w-[640px]">
            <h1 className="mb-2 text-[22px] font-bold tracking-tight text-ink-900">
              {selected.title}
            </h1>
            <p className="mb-6 text-[12.5px] text-ink-400">
              <Calendar className="mr-1 inline h-3 w-3" />
              {selected.updatedAt
                ? new Date(selected.updatedAt).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </p>

            {selected.html && (
              <div
                className="prose prose-sm max-w-none text-[14px] leading-relaxed text-ink-700 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:mb-1 [&_ol]:my-3 [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_table]:my-4 [&_table]:border-collapse [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: selected.html }}
              />
            )}

          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-ink-400">
            Seleziona una risorsa dalla lista
          </div>
        )}
      </div>
    </div>
  )
}
