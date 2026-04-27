"use client"

import { useState, useTransition, useRef, useEffect } from "react"
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
  ImageIcon,
  Link2,
  Table,
  Rows3,
  Columns3,
  Trash,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  PanelTop,
  TableCellsMerge,
  TableCellsSplit,
} from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExt from "@tiptap/extension-underline"
import LinkExt from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { Table as TableExt } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { NEWS_CATEGORIES } from "@/lib/constants"
import { createNews, updateNews, deleteNews, toggleNewsPin, getNewsCategories, upsertNewsCategory, deleteNewsCategory } from "@/lib/actions/data"
import type { News, NewsCategory } from "@/lib/db/schema"

export function GestioneNewsClient({ news: initial, userId, initialCategories }: { news: News[]; userId: string; initialCategories?: NewsCategory[] }) {
  const router = useRouter()
  const [newsList, setNewsList] = useState(initial)
  const [selectedId, setSelectedId] = useState<number | null>(initial[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [modified, setModified] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categories, setCategories] = useState<{ id: string; color: string }[]>(
    initialCategories && initialCategories.length > 0
      ? initialCategories.map((c) => ({ id: c.label, color: c.color ?? "#64748B" }))
      : [...NEWS_CATEGORIES]
  )

  const selected = newsList.find((n) => n.id === selectedId)

  const [editTitle, setEditTitle] = useState(selected?.title ?? "")
  const [editCategory, setEditCategory] = useState(selected?.category ?? NEWS_CATEGORIES[0].id)
  const [editExcerpt, setEditExcerpt] = useState(selected?.excerpt ?? "")
  const [editIcon, setEditIcon] = useState<string | null>(selected?.icon ?? null)
  const [, setTick] = useState(0)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
      Image.configure({ inline: false, allowBase64: false }),
      TableExt.configure({ resizable: true, lastColumnResizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: selected?.body ?? "",
    onUpdate: () => setModified(true),
    onTransaction: () => setTick((t) => t + 1),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] focus:outline-none text-[14px] leading-relaxed text-ink-700 [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-6 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:my-3 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:my-3 [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-500 [&_blockquote]:my-3 [&_a]:text-pink [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_table]:border-collapse [&_table]:my-4 [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_hr]:my-4 [&_hr]:border-border-1 [&_strong]:font-semibold [&_strong]:text-ink-900",
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
    setEditIcon(item.icon ?? null)
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
        icon: editIcon,
      })
      setModified(false)
      setNewsList((prev) =>
        prev.map((n) =>
          n.id === selected.id
            ? { ...n, title: editTitle, category: editCategory, excerpt: editExcerpt, body, icon: editIcon }
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
      const newItem: News = {
        id: result.id,
        category: NEWS_CATEGORIES[0].id,
        title: "Nuovo articolo",
        excerpt: "",
        body: "",
        pinned: false,
        icon: null,
        authorId: userId,
        createdAt: new Date(),
      }
      setNewsList((prev) => [newItem, ...prev])
      setSelectedId(result.id)
      setEditTitle("Nuovo articolo")
      setEditCategory(NEWS_CATEGORIES[0].id)
      setEditExcerpt("")
      editor?.commands.setContent("")
      setModified(false)
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
            const catColor = categories.find((c) => c.id === item.category)?.color ?? "#64748B"
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
                {item.icon ? (
                  <span className="mt-0.5 shrink-0 text-[16px] leading-none">{item.icon}</span>
                ) : (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                )}
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
            <EmojiIconPicker
              value={editIcon}
              onChange={(emoji) => { setEditIcon(emoji); setModified(true) }}
            />
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
              { icon: Heading1, action: () => smartToggleHeading(editor, 1), active: editor?.isActive("heading", { level: 1 }), title: "Titolo 1" },
              { icon: Heading2, action: () => smartToggleHeading(editor, 2), active: editor?.isActive("heading", { level: 2 }), title: "Titolo 2" },
              null,
              { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold"), title: "Grassetto" },
              { icon: Italic, action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic"), title: "Corsivo" },
              { icon: Underline, action: () => editor?.chain().focus().toggleUnderline().run(), active: editor?.isActive("underline"), title: "Sottolineato" },
              null,
              { icon: List, action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList"), title: "Elenco puntato" },
              { icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList"), title: "Elenco numerato" },
              { icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive("blockquote"), title: "Citazione" },
              null,
              { icon: Link2, action: () => { if (editor?.isActive("link")) { editor?.chain().focus().unsetLink().run() } else { const url = window.prompt("URL:"); if (url) editor?.chain().focus().setLink({ href: url }).run() } }, active: editor?.isActive("link"), title: "Link" },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="mx-1 h-5 w-px bg-border-1" />
              ) : (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={item.action}
                  title={item.title}
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
            <div className="mx-1 h-5 w-px bg-border-1" />
            <NewsImageBtn editor={editor} onModified={() => setModified(true)} />
            <div className="mx-1 h-5 w-px bg-border-1" />
            <NewsTableToolbar editor={editor} />
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
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="text-[11px] font-medium text-pink hover:underline"
            >
              Gestisci etichette
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center text-ink-400">
          Seleziona un articolo da modificare
        </div>
      )}

      {/* Category manager dialog */}
      {showCategoryManager && (
        <CategoryManagerDialog
          categories={categories}
          onUpdate={setCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  )
}

function CategoryManagerDialog({
  categories,
  onUpdate,
  onClose,
}: {
  categories: { id: string; color: string }[]
  onUpdate: (cats: { id: string; color: string }[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState(categories)
  const [newLabel, setNewLabel] = useState("")
  const [newColor, setNewColor] = useState("#64748B")
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!newLabel.trim()) return
    const label = newLabel.trim().toUpperCase()
    if (items.some((c) => c.id === label)) return
    startTransition(async () => {
      await upsertNewsCategory({ label, color: newColor })
      const updated = [...items, { id: label, color: newColor }]
      setItems(updated)
      onUpdate(updated)
      setNewLabel("")
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const dbCats = await getNewsCategories()
      const cat = dbCats.find((c) => c.label === id)
      if (cat) await deleteNewsCategory(cat.id)
      const updated = items.filter((c) => c.id !== id)
      setItems(updated)
      onUpdate(updated)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[400px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-[18px] font-bold text-ink-900">Gestisci etichette</h2>

        <div className="mb-4 space-y-2">
          {items.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 rounded-[10px] border border-border-1 px-3 py-2">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="flex-1 text-[13px] font-medium text-ink-900">{cat.id}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                disabled={isPending}
                className="text-[11px] text-red-500 hover:underline disabled:opacity-50"
              >
                Elimina
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nuova etichetta…"
            className="h-8 flex-1 rounded-[8px] border border-border-1 px-3 text-[13px] outline-none focus:border-pink"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-[6px] border border-border-1"
          />
          <button
            onClick={handleAdd}
            disabled={!newLabel.trim() || isPending}
            className="h-8 rounded-[999px] bg-pink px-4 text-[12px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
          >
            Aggiungi
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="h-8 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

function EmojiIconPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (emoji: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const Picker = useRef<React.ComponentType<Record<string, unknown>> | null>(null)
  const [ready, setReady] = useState(false)

  const dataRef = useRef<unknown>(null)

  useEffect(() => {
    if (open && !Picker.current) {
      Promise.all([
        import("@emoji-mart/react"),
        import("@emoji-mart/data"),
      ]).then(([mod, data]) => {
        Picker.current = mod.default
        dataRef.current = data.default
        setReady(true)
      })
    }
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] transition-colors hover:bg-surface-2"
        title={value ? "Cambia icona" : "Aggiungi icona"}
      >
        {value ? (
          <span className="text-[22px] leading-none">{value}</span>
        ) : (
          <FileText className="h-5 w-5 text-ink-300" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1">
          {value && (
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className="mb-1 rounded-[8px] border border-border-1 bg-surface px-3 py-1.5 text-[11px] font-medium text-red-400 shadow-sm hover:text-red-500"
            >
              Rimuovi icona
            </button>
          )}
          {ready && Picker.current && (
            <Picker.current
              data={dataRef.current}
              onEmojiSelect={(e: { native: string }) => { onChange(e.native); setOpen(false) }}
              theme="light"
              locale="it"
              previewPosition="none"
              skinTonePosition="search"
              set="native"
            />
          )}
        </div>
      )}
    </div>
  )
}

function NewsTableToolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isInTable = editor?.isActive("table")

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const items = isInTable
    ? [
        { label: "Riga sopra", icon: ArrowUpFromLine, action: () => editor?.chain().focus().addRowBefore().run() },
        { label: "Riga sotto", icon: ArrowDownFromLine, action: () => editor?.chain().focus().addRowAfter().run() },
        { label: "Colonna a sinistra", icon: ArrowLeftFromLine, action: () => editor?.chain().focus().addColumnBefore().run() },
        { label: "Colonna a destra", icon: ArrowRightFromLine, action: () => editor?.chain().focus().addColumnAfter().run() },
        null,
        { label: "Riga intestazione", icon: PanelTop, action: () => editor?.chain().focus().toggleHeaderRow().run() },
        { label: "Unisci celle", icon: TableCellsMerge, action: () => editor?.chain().focus().mergeCells().run() },
        { label: "Dividi celle", icon: TableCellsSplit, action: () => editor?.chain().focus().splitCell().run() },
        null,
        { label: "Elimina riga", icon: Rows3, action: () => editor?.chain().focus().deleteRow().run(), danger: true },
        { label: "Elimina colonna", icon: Columns3, action: () => editor?.chain().focus().deleteColumn().run(), danger: true },
        { label: "Elimina tabella", icon: Trash, action: () => editor?.chain().focus().deleteTable().run(), danger: true },
      ]
    : [
        { label: "Inserisci tabella", icon: Table, action: () => { editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() } },
      ]

  return (
    <div className="relative" ref={ref}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
        title="Tabella"
        className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
        style={{
          backgroundColor: isInTable ? "#FDF2F8" : open ? "#F1F5F9" : "transparent",
          color: isInTable ? "#EC4899" : "#64748B",
        }}
      >
        <Table className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[200px] rounded-[10px] border border-border-1 bg-surface py-1 shadow-lg">
          {items.map((item, i) =>
            item === null ? (
              <div key={i} className="my-1 h-px bg-border-1" />
            ) : (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { item.action(); setOpen(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-surface-2"
                style={{ color: (item as { danger?: boolean }).danger ? "#EF4444" : "#475569" }}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

function smartToggleHeading(editor: ReturnType<typeof useEditor> | null, level: 1 | 2) {
  if (!editor) return

  const { state } = editor
  const { from, to } = state.selection

  if (from === to) {
    editor.chain().focus().toggleHeading({ level }).run()
    return
  }

  const $from = state.doc.resolve(from)
  const $to = state.doc.resolve(to)
  const sameParent = $from.sameParent($to)
  const parentNode = $from.parent
  const blockStart = $from.start()
  const blockEnd = $from.end()

  if (
    !sameParent ||
    parentNode.type.name !== "paragraph" ||
    (from <= blockStart && to >= blockEnd)
  ) {
    editor.chain().focus().toggleHeading({ level }).run()
    return
  }

  const chain = editor.chain().focus()
  if (to < blockEnd) chain.setTextSelection(to).splitBlock()
  if (from > blockStart) {
    chain.setTextSelection(from).splitBlock()
  } else if (to < blockEnd) {
    chain.setTextSelection(from)
  }
  chain.toggleHeading({ level }).run()
}

function NewsImageBtn({ editor, onModified }: { editor: ReturnType<typeof useEditor> | null; onModified: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) { alert("Errore caricamento immagine"); return }
    const { url } = await res.json()
    editor?.chain().focus().setImage({ src: url }).run()
    onModified()
  }

  return (
    <>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        title="Inserisci immagine"
        className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#64748B] transition-colors"
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = "" }}
      />
    </>
  )
}
