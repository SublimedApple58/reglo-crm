"use client"

import { useState, useCallback, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Pin, Calendar, Send, Trash2 } from "lucide-react"
import { NEWS_CATEGORIES } from "@/lib/constants"
import { getComments, createComment, deleteComment, markNewsAsRead } from "@/lib/actions/data"
import type { News } from "@/lib/db/schema"

export function BachecaClient({ news, userId }: { news: News[]; userId?: string }) {
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

  // Mark as read when a news item is selected
  useEffect(() => {
    if (selectedId && userId) {
      markNewsAsRead(selectedId)
    }
  }, [selectedId, userId])

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
                <p className="mb-0.5 text-[13px] font-semibold text-ink-900">
                  {item.icon && <span className="mr-1.5">{item.icon}</span>}
                  {item.title}
                </p>
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
                {selected.icon && <span className="mr-2">{selected.icon}</span>}
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
                className="reglo-links prose prose-sm max-w-none text-[14px] leading-relaxed text-ink-700 [&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:text-ink-900 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-ink-900 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-500 [&_blockquote]:my-3 [&_a]:text-pink [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_strong]:font-semibold [&_strong]:text-ink-900 [&_hr]:my-4 [&_hr]:border-border-1 [&_table]:border-collapse [&_table]:my-4 [&_table]:w-full [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold"
                dangerouslySetInnerHTML={{ __html: selected.body }}
              />
            )}

            {/* Comments */}
            <CommentsSection targetType="news" targetId={selected.id} userId={userId} />

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

type CommentItem = {
  comment: { id: number; body: string; createdAt: Date; userId: string }
  user: { id: string; name: string; color: string; avatar: string | null }
}

function CommentsSection({ targetType, targetId, userId }: { targetType: "news" | "resource"; targetId: number; userId?: string }) {
  const [commentsList, setCommentsList] = useState<CommentItem[]>([])
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getComments(targetType, targetId).then(setCommentsList)
  }, [targetType, targetId])

  function handleSubmit() {
    if (!body.trim()) return
    startTransition(async () => {
      await createComment({ targetType, targetId, body: body.trim() })
      setBody("")
      const updated = await getComments(targetType, targetId)
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
