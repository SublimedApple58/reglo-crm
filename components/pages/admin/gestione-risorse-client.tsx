"use client"

import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Pin,
  Save,
  Eye,
  Trash2,
  X,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link2,
  Undo2,
  Redo2,
  FileText,
  LinkIcon,
  Building,
  BookOpen,
  Kanban,
  DollarSign,
  Users,
  Phone,
  Mail,
  Shield,
  MessageSquare,
  Star,
  Heart,
  Zap,
  Globe,
  ImageIcon,
  ImagePlus,
  X as XIcon,
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
import Placeholder from "@tiptap/extension-placeholder"
import { Table as TableExt } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { RESOURCE_CATEGORIES } from "@/lib/constants"
import { upsertResource, deleteResource, getResources, upsertResourceCategory, deleteResourceCategory } from "@/lib/actions/data"
import { searchGlobal } from "@/lib/actions/autoscuole"
import type { Resource, ResourceCategory } from "@/lib/db/schema"

type CategoryDef = { id: string; label: string; icon: string; color: string }

export function GestioneRisorseClient({ resources: initial, initialCategories }: { resources: Resource[]; initialCategories?: ResourceCategory[] }) {
  const router = useRouter()
  const [resources, setResources] = useState(initial)
  const [selectedId, setSelectedId] = useState<number | null>(resources[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [modified, setModified] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)
  const [showInternalLink, setShowInternalLink] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categories, setCategories] = useState<CategoryDef[]>(
    initialCategories && initialCategories.length > 0
      ? initialCategories.map((c) => ({ id: c.label, label: c.label, icon: c.icon ?? "file-text", color: c.color ?? "#64748B" }))
      : RESOURCE_CATEGORIES.map((c) => ({ id: c.label, label: c.label, icon: c.icon, color: c.color }))
  )

  const selected = resources.find((r) => r.id === selectedId)

  const [editTitle, setEditTitle] = useState(selected?.title ?? "")
  const [editCategory, setEditCategory] = useState(selected?.category ?? categories[0]?.label ?? "")
  const [editIcon, setEditIcon] = useState<string | null>(selected?.icon ?? null)
  const [editCoverImage, setEditCoverImage] = useState<string | null>(selected?.coverImage ?? null)
  const [, setTick] = useState(0)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: null },
        shouldAutoLink: (url) => !url.startsWith("/"),
      }).extend({
        renderHTML({ HTMLAttributes }) {
          const href = HTMLAttributes.href ?? ""
          const isInternal = href.startsWith("/")
          return ["a", { ...HTMLAttributes, target: isInternal ? "_self" : "_blank", rel: isInternal ? null : "noopener noreferrer" }, 0]
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Inizia a scrivere..." }),
      TableExt.configure({ resizable: true, lastColumnResizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: selected?.html ?? "",
    onUpdate: () => setModified(true),
    onTransaction: () => setTick((t) => t + 1),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] focus:outline-none text-[14px] leading-relaxed text-ink-700 [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-6 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:my-3 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:my-3 [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-500 [&_blockquote]:my-3 [&_a]:text-pink [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_table]:border-collapse [&_table]:my-4 [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_hr]:my-4 [&_hr]:border-border-1 [&_strong]:font-semibold [&_strong]:text-ink-900",
      },
    },
  })

  function selectResource(id: number) {
    const res = resources.find((r) => r.id === id)
    if (!res) return
    setSelectedId(id)
    setEditTitle(res.title)
    setEditCategory(res.category)
    setEditIcon(res.icon ?? null)
    setEditCoverImage(res.coverImage ?? null)
    editor?.commands.setContent(res.html ?? "")
    setModified(false)
  }

  function handleSave() {
    if (!selected) return
    const html = editor?.getHTML() ?? ""
    startTransition(async () => {
      await upsertResource({
        id: selected.id,
        category: editCategory,
        title: editTitle,
        html,
        pinned: selected.pinned ?? false,
        icon: editIcon ?? undefined,
        coverImage: editCoverImage,
      })
      setModified(false)
      setResources((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? { ...r, title: editTitle, category: editCategory, html, icon: editIcon, coverImage: editCoverImage }
            : r
        )
      )
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const newId = await upsertResource({
        category: categories[0]?.label ?? "",
        title: "Nuova risorsa",
        html: "",
        pinned: false,
      })
      const newResource: Resource = {
        id: newId,
        category: categories[0]?.label ?? "",
        title: "Nuova risorsa",
        excerpt: null,
        html: "",
        authorId: null,
        tags: [],
        pinned: false,
        icon: null,
        color: null,
        coverImage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setResources((prev) => [newResource, ...prev])
      setSelectedId(newId)
      setEditTitle("Nuova risorsa")
      setEditCategory(categories[0]?.label ?? "")
      setEditCoverImage(null)
      editor?.commands.setContent("")
      setModified(false)
    })
  }

  function handleDelete() {
    if (!selected || !confirm("Eliminare questa risorsa?")) return
    startTransition(async () => {
      await deleteResource(selected.id)
      setResources((prev) => prev.filter((r) => r.id !== selected.id))
      const remaining = resources.filter((r) => r.id !== selected.id)
      if (remaining.length > 0) {
        selectResource(remaining[0].id)
      } else {
        setSelectedId(null)
      }
    })
  }

  const filteredDocs = resources.filter((r) => {
    if (!search) return true
    return r.title.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
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
              disabled={isPending}
              className="flex h-8 w-8 items-center justify-center rounded-[999px] bg-pink text-white hover:bg-pink/90 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => selectResource(doc.id)}
                className="flex w-full items-start gap-3 border-b border-border-2 px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: doc.id === selectedId ? "#FDF2F8" : "transparent",
                  borderLeftWidth: 3,
                  borderLeftColor: doc.id === selectedId ? "#EC4899" : "transparent",
                }}
              >
                {doc.icon ? (
                  <span className="mt-0.5 shrink-0 text-[16px] leading-none">{doc.icon}</span>
                ) : (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{doc.title}</p>
                    {doc.pinned && <Pin className="h-3 w-3 shrink-0 text-pink" />}
                  </div>
                  <p className="text-[11px] text-ink-400">{doc.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        {selected ? (
          <div className="flex flex-col overflow-hidden">
            {/* Editor header */}
            <div className="flex items-center gap-3 border-b border-border-1 px-5 py-3">
              <EmojiIconPicker
                value={editIcon}
                onChange={(emoji) => { setEditIcon(emoji); setModified(true) }}
              />
              <div className="flex-1">
                <input
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value)
                    setModified(true)
                  }}
                  className="w-full text-[16px] font-bold text-ink-900 outline-none"
                  placeholder="Titolo risorsa"
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
                onClick={() => setShowPreview(true)}
                className="flex h-8 items-center gap-1.5 rounded-[999px] border border-border-1 px-3 text-[12px] font-medium text-ink-600 hover:bg-surface-2"
              >
                <Eye className="h-3.5 w-3.5" />
                Anteprima
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
              <ToolbarBtn icon={Undo2} action={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Annulla" />
              <ToolbarBtn icon={Redo2} action={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Ripeti" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              <ToolbarBtn icon={Heading1} action={() => smartToggleHeading(editor, 1)} active={editor?.isActive("heading", { level: 1 })} title="Titolo 1" />
              <ToolbarBtn icon={Heading2} action={() => smartToggleHeading(editor, 2)} active={editor?.isActive("heading", { level: 2 })} title="Titolo 2" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              <ToolbarBtn icon={Bold} action={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Grassetto" />
              <ToolbarBtn icon={Italic} action={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Corsivo" />
              <ToolbarBtn icon={Underline} action={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Sottolineato" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              <ToolbarBtn icon={List} action={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Elenco puntato" />
              <ToolbarBtn icon={ListOrdered} action={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Elenco numerato" />
              <ToolbarBtn icon={Quote} action={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Citazione" />
              <ToolbarBtn icon={Minus} action={() => editor?.chain().focus().setHorizontalRule().run()} title="Linea orizzontale" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              <ToolbarBtn
                icon={Link2}
                active={editor?.isActive("link")}
                title="Link"
                action={() => {
                  if (editor?.isActive("link")) {
                    editor?.chain().focus().unsetLink().run()
                  } else {
                    const url = window.prompt("URL:")
                    if (url) editor?.chain().focus().setLink({ href: url }).run()
                  }
                }}
              />
              <ToolbarBtn icon={LinkIcon} action={() => setShowInternalLink(true)} title="Link interno" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              <ImageUploadBtn editor={editor} onModified={() => setModified(true)} />
              <CoverImageBtn coverImage={editCoverImage} onChange={(url) => { setEditCoverImage(url); setModified(true) }} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              <TableToolbar editor={editor} />
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editCoverImage && (
                <div className="relative mb-4 overflow-hidden rounded-[12px]">
                  <img src={editCoverImage} alt="" className="w-full object-cover" style={{ maxHeight: 260 }} />
                  <button
                    onClick={() => { setEditCoverImage(null); setModified(true) }}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              <EditorContent editor={editor} />
            </div>

            {/* Meta footer */}
            <div className="flex items-center gap-3 border-t border-border-1 px-5 py-3">
              <select
                value={editCategory}
                onChange={(e) => {
                  setEditCategory(e.target.value)
                  setModified(true)
                }}
                className="h-7 rounded-[8px] border border-border-1 px-2 text-[12px] text-ink-700 outline-none"
              >
                {categories.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex-1" />

              <button
                onClick={() => setShowCategoryManager(true)}
                className="text-[11px] font-medium text-pink hover:underline"
              >
                Gestisci categorie
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-ink-400">
            Seleziona una risorsa da modificare
          </div>
        )}
      </div>

      {/* Internal link dialog */}
      {showCategoryManager && (
        <ResourceCategoryManager
          categories={categories}
          onUpdate={setCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {showInternalLink && (
        <InternalLinkDialog
          resources={resources}
          onSelect={(href, label) => {
            editor?.chain().focus().setLink({ href }).insertContent(label).run()
            setShowInternalLink(false)
            setModified(true)
          }}
          onClose={() => setShowInternalLink(false)}
        />
      )}

      {/* Preview dialog */}
      {showPreview && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPreview(false)}>
          <div
            className="w-[720px] max-h-[80vh] overflow-y-auto rounded-[20px] border border-border-1 bg-surface p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[20px] font-bold text-ink-900">{editTitle}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="prose prose-sm max-w-none text-[14px] leading-relaxed text-ink-700 [&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:text-ink-900 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:text-ink-900 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-pink [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-500 [&_blockquote]:my-3 [&_a]:text-pink [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_strong]:font-semibold [&_strong]:text-ink-900 [&_table]:my-4 [&_table]:border-collapse [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_hr]:my-4 [&_hr]:border-border-1 [&_mark]:bg-yellow-200 [&_mark]:px-0.5"
              dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? "" }}
            />
          </div>
        </div>
      )}
    </>
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

function smartToggleHeading(editor: ReturnType<typeof useEditor> | null, level: 1 | 2) {
  if (!editor) return

  const { state } = editor
  const { from, to } = state.selection

  // No selection (just cursor) — default: toggle whole block
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

  // Full block, multi-block, or not a paragraph — default behavior
  if (
    !sameParent ||
    parentNode.type.name !== "paragraph" ||
    (from <= blockStart && to >= blockEnd)
  ) {
    editor.chain().focus().toggleHeading({ level }).run()
    return
  }

  // Partial selection within a paragraph — split first, then apply heading
  const chain = editor.chain().focus()
  if (to < blockEnd) chain.setTextSelection(to).splitBlock()
  if (from > blockStart) {
    // Split at start — cursor lands in the selected-text block (correct)
    chain.setTextSelection(from).splitBlock()
  } else if (to < blockEnd) {
    // Only split at end — cursor landed in the remainder block (wrong)
    // Move back to the selected-text block
    chain.setTextSelection(from)
  }
  chain.toggleHeading({ level }).run()
}

function TableToolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
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

function ToolbarBtn({
  icon: Icon,
  action,
  active,
  disabled,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
      disabled={disabled}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors disabled:opacity-30"
      style={{
        backgroundColor: active ? "#FDF2F8" : "transparent",
        color: active ? "#EC4899" : "#64748B",
      }}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function ImageUploadBtn({ editor, onModified }: { editor: ReturnType<typeof useEditor> | null; onModified: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Errore caricamento immagine: ${data.error ?? res.statusText}`)
      return
    }
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

function CoverImageBtn({ coverImage, onChange }: { coverImage: string | null; onChange: (url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Errore caricamento copertina: ${data.error ?? res.statusText}`)
      return
    }
    const { url } = await res.json()
    onChange(url)
  }

  return (
    <>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        title={coverImage ? "Cambia copertina" : "Aggiungi copertina"}
        className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
        style={{ color: coverImage ? "#EC4899" : "#64748B" }}
      >
        <ImagePlus className="h-4 w-4" />
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

const CRM_PAGES = [
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Mappa territorio", href: "/pipeline/mappa", icon: Building },
  { label: "Commissioni", href: "/commissioni", icon: DollarSign },
  { label: "Risorse", href: "/risorse", icon: BookOpen },
  { label: "Bacheca news", href: "/bacheca", icon: FileText },
  { label: "Gestione Sales", href: "/admin/gestione-sales", icon: Users },
]

function InternalLinkDialog({
  resources,
  onSelect,
  onClose,
}: {
  resources: Resource[]
  onSelect: (href: string, label: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ autoscuole: { id: string; name: string; town: string; province: string }[] }>({ autoscuole: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (query.length < 2) { setSearchResults({ autoscuole: [] }); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const r = await searchGlobal(query)
      setSearchResults({ autoscuole: r.autoscuole })
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const filteredResources = resources.filter((r) => {
    if (!query) return true
    return r.title.toLowerCase().includes(query.toLowerCase())
  }).slice(0, 5)

  const filteredPages = CRM_PAGES.filter((p) => {
    if (!query) return true
    return p.label.toLowerCase().includes(query.toLowerCase())
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]" onClick={onClose}>
      <div className="w-[480px] overflow-hidden rounded-[16px] border border-border-1 bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border-1 px-4 py-3">
          <LinkIcon className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca pagina, risorsa o autoscuola..."
            className="flex-1 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400"
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {/* CRM Pages */}
          {filteredPages.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10.5px] font-semibold tracking-wider text-ink-400 uppercase">Pagine CRM</div>
              {filteredPages.map((p) => (
                <button
                  key={p.href}
                  onClick={() => onSelect(p.href, p.label)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <p.icon className="h-4 w-4 shrink-0 text-ink-400" />
                  <span className="text-[13px] font-medium text-ink-900">{p.label}</span>
                  <span className="ml-auto text-[11px] text-ink-400">{p.href}</span>
                </button>
              ))}
            </div>
          )}

          {/* Resources */}
          {filteredResources.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10.5px] font-semibold tracking-wider text-ink-400 uppercase">Risorse</div>
              {filteredResources.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelect(`/risorse#${r.id}`, r.title)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">{r.title}</p>
                    <p className="text-[11px] text-ink-400">{r.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Autoscuole from search */}
          {searchResults.autoscuole.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10.5px] font-semibold tracking-wider text-ink-400 uppercase">Autoscuole</div>
              {searchResults.autoscuole.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onSelect(`/autoscuola/${a.id}`, a.name)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <Building className="h-4 w-4 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">{a.name}</p>
                    <p className="text-[11px] text-ink-400">{a.town}, {a.province}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !loading && searchResults.autoscuole.length === 0 && filteredResources.length === 0 && filteredPages.length === 0 && (
            <div className="p-6 text-center text-[13px] text-ink-400">Nessun risultato</div>
          )}

          {loading && <div className="p-4 text-center text-[13px] text-ink-400">Ricerca...</div>}
        </div>
      </div>
    </div>
  )
}

const ICON_OPTIONS: { value: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "file-text", Icon: FileText },
  { value: "phone", Icon: Phone },
  { value: "mail", Icon: Mail },
  { value: "shield", Icon: Shield },
  { value: "book-open", Icon: BookOpen },
  { value: "users", Icon: Users },
  { value: "building", Icon: Building },
  { value: "dollar-sign", Icon: DollarSign },
  { value: "message-square", Icon: MessageSquare },
  { value: "star", Icon: Star },
  { value: "heart", Icon: Heart },
  { value: "zap", Icon: Zap },
  { value: "globe", Icon: Globe },
]

function CategoryIcon({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  const opt = ICON_OPTIONS.find((o) => o.value === icon)
  const Comp = opt?.Icon ?? FileText
  return <span style={{ color }}><Comp className={size <= 14 ? "h-3.5 w-3.5" : "h-4 w-4"} /></span>
}

function ResourceCategoryManager({
  categories,
  onUpdate,
  onClose,
}: {
  categories: CategoryDef[]
  onUpdate: (cats: CategoryDef[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState(categories)
  const [newLabel, setNewLabel] = useState("")
  const [newColor, setNewColor] = useState("#64748B")
  const [newIcon, setNewIcon] = useState("file-text")
  const [isPending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [reassignTo, setReassignTo] = useState<string>("")

  function handleAdd() {
    if (!newLabel.trim()) return
    const label = newLabel.trim()
    if (items.some((c) => c.label === label)) return
    startTransition(async () => {
      await upsertResourceCategory({ label, color: newColor, icon: newIcon })
      const updated = [...items, { id: label, label, icon: newIcon, color: newColor }]
      setItems(updated)
      onUpdate(updated)
      setNewLabel("")
    })
  }

  function handleConfirmDelete() {
    if (!deleteTarget || !reassignTo) return
    startTransition(async () => {
      const { getResourceCategories } = await import("@/lib/actions/data")
      const dbCats = await getResourceCategories()
      const cat = dbCats.find((c) => c.label === deleteTarget)
      if (cat) await deleteResourceCategory(cat.id, reassignTo)
      const updated = items.filter((c) => c.label !== deleteTarget)
      setItems(updated)
      onUpdate(updated)
      setDeleteTarget(null)
      setReassignTo("")
    })
  }

  const otherCategories = items.filter((c) => c.label !== deleteTarget)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">Gestisci categorie</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Delete confirmation */}
        {deleteTarget && (
          <div className="mb-4 rounded-[12px] border border-red-200 bg-red-50 p-4">
            <p className="mb-3 text-[13px] font-medium text-ink-900">
              Sposta le risorse di <strong>{deleteTarget}</strong> in:
            </p>
            <div className="mb-3 space-y-1.5">
              {otherCategories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setReassignTo(cat.label)}
                  className="flex w-full items-center gap-2.5 rounded-[8px] border px-3 py-2 text-left text-[13px] transition-colors"
                  style={{
                    borderColor: reassignTo === cat.label ? "#EC4899" : "#E2E8F0",
                    backgroundColor: reassignTo === cat.label ? "#FDF2F8" : "white",
                  }}
                >
                  <CategoryIcon icon={cat.icon} color={cat.color} size={14} />
                  <span className="font-medium text-ink-900">{cat.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setReassignTo("") }}
                className="h-8 flex-1 rounded-[999px] border border-border-1 text-[12px] font-medium text-ink-600 hover:bg-surface-2"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!reassignTo || isPending}
                className="h-8 flex-1 rounded-[999px] bg-red-500 text-[12px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? "Spostamento..." : "Elimina e sposta"}
              </button>
            </div>
          </div>
        )}

        {/* Category list */}
        <div className="mb-5 space-y-1.5">
          {items.map((cat) => (
            <div key={cat.label} className="flex items-center gap-3 rounded-[10px] border border-border-1 px-3 py-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                style={{ backgroundColor: cat.color + "18" }}
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size={14} />
              </div>
              <span className="flex-1 text-[13px] font-medium text-ink-900">{cat.label}</span>
              <button
                onClick={() => { setDeleteTarget(cat.label); setReassignTo(otherCategories[0]?.label ?? "") }}
                disabled={isPending || items.length <= 1}
                className="text-[11px] text-red-500 hover:underline disabled:opacity-30"
              >
                Elimina
              </button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="rounded-[12px] border border-border-1 bg-surface-2 p-3">
          <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Nuova categoria</p>
          <div className="mb-2.5 flex items-center gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Nome categoria…"
              className="h-9 flex-1 rounded-[8px] border border-border-1 bg-white px-3 text-[13px] outline-none focus:border-pink"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-[8px] border border-border-1"
            />
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setNewIcon(opt.value)}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border transition-colors"
                style={{
                  borderColor: newIcon === opt.value ? newColor : "#E2E8F0",
                  backgroundColor: newIcon === opt.value ? newColor + "18" : "white",
                  color: newIcon === opt.value ? newColor : "#94A3B8",
                }}
              >
                <opt.Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!newLabel.trim() || isPending}
            className="h-9 w-full rounded-[999px] bg-pink text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
          >
            Aggiungi categoria
          </button>
        </div>
      </div>
    </div>
  )
}
