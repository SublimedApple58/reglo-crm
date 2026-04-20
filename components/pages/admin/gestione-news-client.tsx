"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Pin,
  Save,
  Trash2,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  FileText,
} from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExt from "@tiptap/extension-underline"
import { NEWS_CATEGORIES } from "@/lib/constants"
import { createNews, updateNews, deleteNews, toggleNewsPin } from "@/lib/actions/data"
import type { News } from "@/lib/db/schema"

export function GestioneNewsClient({ news: initial, userId }: { news: News[]; userId: string }) {
  const router = useRouter()
  const [newsList, setNewsList] = useState(initial)
  const [selectedId, setSelectedId] = useState<number | null>(initial[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [modified, setModified] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selected = newsList.find((n) => n.id === selectedId)

  const [editTitle, setEditTitle] = useState(selected?.title ?? "")
  const [editCategory, setEditCategory] = useState(selected?.category ?? NEWS_CATEGORIES[0].id)
  const [editExcerpt, setEditExcerpt] = useState(selected?.excerpt ?? "")

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, UnderlineExt],
    content: selected?.body ?? "",
    onUpdate: () => setModified(true),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] focus:outline-none text-[14px] leading-relaxed text-ink-700 [&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:mb-2 [&_p]:mb-2",
      },
    },
  })

  function selectNews(id: number) {
    const item = newsList.find((n) => n.id === id)
    if (!item) return
    setSelectedId(id)
    setEditTitle(item.title)
    setEditCategory(item.category)
    setEditExcerpt(item.excerpt ?? "")
    editor?.commands.setContent(item.body ?? "")
    setModified(false)
  }

  function handleSave() {
    if (!selected) return
    const body = editor?.getHTML() ?? ""
    startTransition(async () => {
      await updateNews(selected.id, {
        title: editTitle,
        category: editCategory,
        excerpt: editExcerpt,
        body,
      })
      setModified(false)
      setNewsList((prev) =>
        prev.map((n) =>
          n.id === selected.id
            ? { ...n, title: editTitle, category: editCategory, excerpt: editExcerpt, body }
            : n
        )
      )
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createNews({
        category: NEWS_CATEGORIES[0].id,
        title: "Nuovo articolo",
        excerpt: "",
        body: "",
        pinned: false,
        authorId: userId,
      })
      router.refresh()
    })
  }

  function handleDelete() {
    if (!selected || !confirm("Eliminare questo articolo?")) return
    startTransition(async () => {
      await deleteNews(selected.id)
      setNewsList((prev) => prev.filter((n) => n.id !== selected.id))
      setSelectedId(newsList[0]?.id !== selected.id ? newsList[0]?.id ?? null : newsList[1]?.id ?? null)
    })
  }

  function handleTogglePin() {
    if (!selected) return
    startTransition(async () => {
      await toggleNewsPin(selected.id)
      setNewsList((prev) =>
        prev.map((n) =>
          n.id === selected.id ? { ...n, pinned: !n.pinned } : n
        )
      )
    })
  }

  const filtered = newsList.filter((n) => {
    if (!search) return true
    return n.title.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="grid h-[calc(100vh)] grid-cols-[320px_1fr]">
      {/* Left list */}
      <div className="flex flex-col border-r border-border-1 bg-surface">
        <div className="flex items-center gap-2 border-b border-border-1 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca…"
              className="h-8 w-full rounded-[999px] border border-border-1 pl-8 pr-3 text-[12.5px] outline-none placeholder:text-ink-400 focus:border-pink"
            />
          </div>
          <button
            onClick={handleCreate}
            className="flex h-8 w-8 items-center justify-center rounded-[999px] bg-pink text-white hover:bg-pink/90"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((item) => {
            const catColor = NEWS_CATEGORIES.find((c) => c.id === item.category)?.color ?? "#64748B"
            return (
              <button
                key={item.id}
                onClick={() => selectNews(item.id)}
                className="flex w-full items-start gap-3 border-b border-border-2 px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: item.id === selectedId ? "#FDF2F8" : "transparent",
                  borderLeftWidth: 3,
                  borderLeftColor: item.id === selectedId ? "#EC4899" : "transparent",
                }}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{item.title}</p>
                    {item.pinned && <Pin className="h-3 w-3 shrink-0 text-pink" />}
                  </div>
                  <span
                    className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                    style={{ backgroundColor: catColor + "15", color: catColor }}
                  >
                    {item.category}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border-1 px-5 py-3">
            <div className="flex-1">
              <input
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); setModified(true) }}
                className="w-full text-[16px] font-bold text-ink-900 outline-none"
                placeholder="Titolo articolo"
              />
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-ink-400">{editCategory}</span>
                {modified && (
                  <span className="rounded-[4px] bg-yellow-50 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-600">
                    Modificato
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleTogglePin}
              className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 hover:bg-surface-2"
            >
              <Pin className="h-3.5 w-3.5" />
              {selected.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={handleDelete}
              className="flex h-8 items-center gap-1.5 rounded-[999px] border border-red-200 px-3 text-[12px] font-medium text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex h-8 items-center gap-1.5 rounded-[999px] bg-pink px-4 text-[12px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Salva
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 border-b border-border-1 px-5 py-1.5">
            {[
              { icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive("heading", { level: 1 }) },
              { icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
              null,
              { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold") },
              { icon: Italic, action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic") },
              { icon: Underline, action: () => editor?.chain().focus().toggleUnderline().run(), active: editor?.isActive("underline") },
              null,
              { icon: List, action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList") },
              { icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList") },
              { icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive("blockquote") },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="mx-1 h-5 w-px bg-border-1" />
              ) : (
                <button
                  key={i}
                  onClick={item.action}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
                  style={{
                    backgroundColor: item.active ? "#FDF2F8" : "transparent",
                    color: item.active ? "#EC4899" : "#64748B",
                  }}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              )
            )}
          </div>

          {/* Excerpt */}
          <div className="border-b border-border-1 px-5 py-3">
            <input
              value={editExcerpt}
              onChange={(e) => { setEditExcerpt(e.target.value); setModified(true) }}
              placeholder="Anteprima / excerpt…"
              className="w-full text-[13px] text-ink-600 outline-none placeholder:text-ink-400"
            />
          </div>

          {/* Editor content */}
          <div className="flex-1 overflow-y-auto p-6">
            <EditorContent editor={editor} />
          </div>

          {/* Category footer */}
          <div className="flex items-center gap-3 border-t border-border-1 px-5 py-3">
            <select
              value={editCategory}
              onChange={(e) => { setEditCategory(e.target.value); setModified(true) }}
              className="h-7 rounded-[8px] border border-border-1 px-2 text-[12px] text-ink-700 outline-none"
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center text-ink-400">
          Seleziona un articolo da modificare
        </div>
      )}
    </div>
  )
}
