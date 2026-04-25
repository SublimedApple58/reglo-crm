"use client"

import { useState, useCallback, useTransition, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Phone,
  Mail,
  Shield,
  FileText,
  BookOpen,
  Search,
  Pin,
  Calendar,
  Maximize2,
  Minimize2,
  Send,
  Trash2,
} from "lucide-react"
import { RESOURCE_CATEGORIES } from "@/lib/constants"
import { getComments, createComment, deleteComment } from "@/lib/actions/data"
import type { Resource } from "@/lib/db/schema"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  phone: Phone,
  mail: Mail,
  shield: Shield,
  "file-text": FileText,
  "book-open": BookOpen,
}

export function RisorseClient({ resources, userId }: { resources: Resource[]; userId?: string }) {
  const router = useRouter()

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement
    const anchor = el.tagName === "A" ? el as HTMLAnchorElement : el.closest("a")
    if (!anchor) return
    const href = anchor.getAttribute("href")
    if (!href) return
    e.preventDefault()
    e.stopPropagation()
    // Internal resource link: /risorse#ID
    if (href.startsWith("/risorse#")) {
      const id = parseInt(href.split("#")[1])
      if (!isNaN(id)) {
        const target = resources.find((r) => r.id === id)
        if (target) setSelectedCategory(target.category)
        setSelectedId(id)
      }
      return
    }
    if (href.startsWith("/")) {
      router.push(href)
    } else {
      window.open(href, "_blank", "noopener,noreferrer")
    }
  }, [router])
  const searchParams = useSearchParams()
  const initialCat = searchParams.get("cat")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCat)
  const [selectedId, setSelectedId] = useState<number | null>(resources[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [fullscreen, setFullscreen] = useState(false)

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
    <div className={`grid h-[calc(100vh)] ${fullscreen ? "grid-cols-[1fr]" : "grid-cols-[230px_360px_1fr]"}`}>
      {/* Categories */}
      {!fullscreen && <div className="flex flex-col border-r border-border-1 bg-bg p-3">
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
      </div>}

      {/* Docs list */}
      {!fullscreen && <div className="flex flex-col border-r border-border-1 bg-surface">
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
      </div>}

      {/* Reader */}
      <div className="flex-1 overflow-y-auto bg-surface p-8">
        {selected ? (
          <div className={`mx-auto ${fullscreen ? "max-w-[800px]" : "max-w-[640px]"}`}>
            <div className="mb-2 flex items-start gap-3">
              <button
                onClick={() => setFullscreen(!fullscreen)}
                className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-600"
                title={fullscreen ? "Riduci" : "Espandi"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <h1 className="text-[22px] font-bold tracking-tight text-ink-900">
                {selected.title}
              </h1>
            </div>
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
                onClick={handleContentClick}
                className="prose prose-sm max-w-none text-[14px] leading-relaxed text-ink-700 reglo-links [&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:text-ink-900 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-ink-900 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-500 [&_blockquote]:my-3 [&_a]:text-pink [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_strong]:font-semibold [&_strong]:text-ink-900 [&_table]:my-4 [&_table]:border-collapse [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_hr]:my-4 [&_hr]:border-border-1 [&_mark]:bg-yellow-200 [&_mark]:px-0.5"
                dangerouslySetInnerHTML={{ __html: selected.html }}
              />
            )}

            {/* Comments */}
            <RisorseCommentsSection targetId={selected.id} userId={userId} />

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

type CommentItem = {
  comment: { id: number; body: string; createdAt: Date; userId: string }
  user: { id: string; name: string; color: string; avatar: string | null }
}

function RisorseCommentsSection({ targetId, userId }: { targetId: number; userId?: string }) {
  const [commentsList, setCommentsList] = useState<CommentItem[]>([])
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getComments("resource", targetId).then(setCommentsList)
  }, [targetId])

  function handleSubmit() {
    if (!body.trim()) return
    startTransition(async () => {
      await createComment({ targetType: "resource", targetId, body: body.trim() })
      setBody("")
      const updated = await getComments("resource", targetId)
      setCommentsList(updated)
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteComment(id)
      setCommentsList((prev) => prev.filter((c) => c.comment.id !== id))
    })
  }

  return (
    <div className="mt-8 border-t border-border-1 pt-6">
      <h3 className="mb-4 text-[14px] font-semibold text-ink-900">
        Commenti ({commentsList.length})
      </h3>

      {commentsList.map(({ comment, user }) => (
        <div key={comment.id} className="mb-3 flex items-start gap-3">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-ink-900">{user.name}</span>
              <span className="text-[11px] text-ink-400">
                {comment.createdAt
                  ? new Date(comment.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : ""}
              </span>
              {userId === comment.userId && (
                <button onClick={() => handleDelete(comment.id)} className="ml-auto text-ink-400 hover:text-red-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-[13px] leading-relaxed text-ink-700">{comment.body}</p>
          </div>
        </div>
      ))}

      <div className="mt-4 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Scrivi un commento…"
          className="h-9 flex-1 rounded-[999px] border border-border-1 bg-surface px-4 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink"
        />
        <button
          onClick={handleSubmit}
          disabled={!body.trim() || isPending}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-pink text-white hover:bg-pink/90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
