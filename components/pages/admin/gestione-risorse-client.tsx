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
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Undo2,
  Redo2,
  Table as TableIcon,
  Tag,
  FileText,
  LinkIcon,
  Building,
  BookOpen,
  Kanban,
  DollarSign,
  Users,
  Palette,
  Smile,
  ImageIcon,
  RowsIcon,
  ColumnsIcon,
  Trash,
} from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExt from "@tiptap/extension-underline"
import LinkExt from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import { TextStyle } from "@tiptap/extension-text-style"
import { Extension } from "@tiptap/react"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g, "") || null,
          renderHTML: (attrs: Record<string, string>) => {
            if (!attrs.fontSize) return {}
            return { style: `font-size: ${attrs.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }) => {
        return chain().setMark("textStyle", { fontSize: size }).run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run()
      },
    }
  },
})
import Color from "@tiptap/extension-color"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { RESOURCE_CATEGORIES } from "@/lib/constants"
import { upsertResource, deleteResource, getResources } from "@/lib/actions/data"
import { searchGlobal } from "@/lib/actions/autoscuole"
import type { Resource } from "@/lib/db/schema"

export function GestioneRisorseClient({ resources: initial }: { resources: Resource[] }) {
  const router = useRouter()
  const [resources, setResources] = useState(initial)
  const [selectedId, setSelectedId] = useState<number | null>(resources[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [modified, setModified] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)
  const [showInternalLink, setShowInternalLink] = useState(false)

  const selected = resources.find((r) => r.id === selectedId)

  const [editTitle, setEditTitle] = useState(selected?.title ?? "")
  const [editCategory, setEditCategory] = useState(selected?.category ?? RESOURCE_CATEGORIES[0].label)
  const [editTags, setEditTags] = useState<string[]>(selected?.tags ?? [])
  const [newTag, setNewTag] = useState("")

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      FontSize,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Inizia a scrivere..." }),
    ],
    content: selected?.html ?? "",
    onUpdate: () => setModified(true),
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
    setEditTags(res.tags ?? [])
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
        tags: editTags,
        pinned: selected.pinned ?? false,
      })
      setModified(false)
      setResources((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? { ...r, title: editTitle, category: editCategory, html, tags: editTags }
            : r
        )
      )
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const newId = await upsertResource({
        category: RESOURCE_CATEGORIES[0].label,
        title: "Nuova risorsa",
        html: "",
        tags: [],
        pinned: false,
      })
      const newResource: Resource = {
        id: newId,
        category: RESOURCE_CATEGORIES[0].label,
        title: "Nuova risorsa",
        excerpt: null,
        html: "",
        authorId: null,
        tags: [],
        pinned: false,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setResources((prev) => [newResource, ...prev])
      setSelectedId(newId)
      setEditTitle("Nuova risorsa")
      setEditCategory(RESOURCE_CATEGORIES[0].label)
      setEditTags([])
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

  function addTag() {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()])
      setNewTag("")
      setModified(true)
    }
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
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
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
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border-1 px-5 py-1.5">
              {/* Undo/Redo */}
              <ToolbarBtn icon={Undo2} action={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Annulla" />
              <ToolbarBtn icon={Redo2} action={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Ripeti" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Font size */}
              <select
                value={editor?.getAttributes("textStyle")?.fontSize ?? ""}
                onChange={(e) => {
                  const size = e.target.value
                  if (size) {
                    editor?.chain().focus().setFontSize(size).run()
                  } else {
                    editor?.chain().focus().unsetFontSize().run()
                  }
                }}
                className="h-7 rounded-[6px] border border-border-1 bg-surface px-1.5 text-[11px] text-ink-600 outline-none"
              >
                <option value="">Dimensione</option>
                <option value="11px">Piccolo (11)</option>
                <option value="13px">Normale (13)</option>
                <option value="16px">Medio (16)</option>
                <option value="18px">Grande (18)</option>
                <option value="22px">Molto grande (22)</option>
                <option value="28px">Titolo (28)</option>
                <option value="36px">Display (36)</option>
              </select>
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Headings */}
              <ToolbarBtn icon={Heading1} action={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} title="Titolo 1" />
              <ToolbarBtn icon={Heading2} action={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Titolo 2" />
              <ToolbarBtn icon={Heading3} action={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="Titolo 3" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Inline formatting */}
              <ToolbarBtn icon={Bold} action={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Grassetto" />
              <ToolbarBtn icon={Italic} action={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Corsivo" />
              <ToolbarBtn icon={Underline} action={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Sottolineato" />
              <ToolbarBtn icon={Strikethrough} action={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} title="Barrato" />
              <ToolbarBtn icon={Highlighter} action={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive("highlight")} title="Evidenzia" />
              {/* Color picker */}
              <ColorPickerBtn editor={editor} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Alignment */}
              <ToolbarBtn icon={AlignLeft} action={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Allinea a sinistra" />
              <ToolbarBtn icon={AlignCenter} action={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Allinea al centro" />
              <ToolbarBtn icon={AlignRight} action={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Allinea a destra" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Block elements */}
              <ToolbarBtn icon={List} action={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Elenco puntato" />
              <ToolbarBtn icon={ListOrdered} action={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Elenco numerato" />
              <ToolbarBtn icon={Quote} action={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Citazione" />
              <ToolbarBtn icon={Minus} action={() => editor?.chain().focus().setHorizontalRule().run()} title="Linea orizzontale" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Link */}
              <ToolbarBtn
                icon={Link2}
                active={editor?.isActive("link")}
                title="Link esterno"
                action={() => {
                  if (editor?.isActive("link")) {
                    editor?.chain().focus().unsetLink().run()
                  } else {
                    const url = window.prompt("URL:")
                    if (url) editor?.chain().focus().setLink({ href: url }).run()
                  }
                }}
              />
              {/* Internal link */}
              <ToolbarBtn icon={LinkIcon} action={() => setShowInternalLink(true)} title="Link interno" />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Image upload */}
              <ImageUploadBtn editor={editor} onModified={() => setModified(true)} />
              {/* Emoji picker */}
              <EmojiPickerBtn editor={editor} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Table */}
              <TableMenuBtn editor={editor} />
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-y-auto p-6">
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
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex flex-1 flex-wrap items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-ink-400" />
                {editTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-[4px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-600"
                  >
                    {tag}
                    <button
                      onClick={() => {
                        setEditTags(editTags.filter((t) => t !== tag))
                        setModified(true)
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="+ tag"
                  className="w-16 text-[11px] text-ink-500 outline-none placeholder:text-ink-400"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-ink-400">
            Seleziona una risorsa da modificare
          </div>
        )}
      </div>

      {/* Internal link dialog */}
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

const COLOR_PALETTE = [
  { label: "Nero", hex: "#000000" },
  { label: "Grigio", hex: "#64748B" },
  { label: "Rosso", hex: "#EF4444" },
  { label: "Blu", hex: "#3B82F6" },
  { label: "Verde", hex: "#10B981" },
  { label: "Arancione", hex: "#F97316" },
  { label: "Viola", hex: "#8B5CF6" },
  { label: "Rosa", hex: "#EC4899" },
]

function ColorPickerBtn({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        title="Colore testo"
        className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
        style={{ color: "#64748B" }}
      >
        <Palette className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 grid grid-cols-4 gap-1 rounded-[10px] border border-border-1 bg-surface p-2 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.hex}
              title={c.label}
              onClick={() => { editor?.chain().focus().setColor(c.hex).run(); setOpen(false) }}
              className="h-6 w-6 rounded-full border border-border-1 transition-transform hover:scale-110"
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <button
            title="Rimuovi colore"
            onClick={() => { editor?.chain().focus().unsetColor().run(); setOpen(false) }}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border-1 text-[10px] text-ink-400 hover:bg-surface-2"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

const EMOJI_LIST = [
  "😀", "😂", "🥲", "😍", "🤩", "😎", "🤔", "😉",
  "👍", "👎", "👏", "🙌", "💪", "🤝", "✌️", "🫡",
  "❤️", "🔥", "⭐", "✅", "❌", "⚠️", "💡", "🎯",
  "📞", "✉️", "📋", "📊", "💰", "🏆", "🚀", "🦈",
  "🎉", "💯", "👀", "🙏", "📌", "🔗", "📆", "⏰",
]

function EmojiPickerBtn({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        title="Emoji"
        className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#64748B] transition-colors"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 grid w-[220px] grid-cols-8 gap-0.5 rounded-[10px] border border-border-1 bg-surface p-2 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { editor?.chain().focus().insertContent(emoji).run(); setOpen(false) }}
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[16px] transition-colors hover:bg-surface-2"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ImageUploadBtn({ editor, onModified }: { editor: ReturnType<typeof useEditor> | null; onModified: () => void }) {
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

function TableMenuBtn({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const ref = useRef<HTMLDivElement>(null)
  const isInTable = editor?.isActive("table")

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
        title="Tabella"
        className="flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors"
        style={{
          backgroundColor: isInTable ? "#FDF2F8" : "transparent",
          color: isInTable ? "#EC4899" : "#64748B",
        }}
      >
        <TableIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[200px] rounded-[10px] border border-border-1 bg-surface p-3 shadow-lg">
          {!isInTable ? (
            <>
              <p className="mb-2 text-[11px] font-semibold text-ink-500">Nuova tabella</p>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-[11px] text-ink-500">Righe</label>
                <input type="number" min={1} max={20} value={rows} onChange={(e) => setRows(+e.target.value)} className="h-6 w-14 rounded border border-border-1 px-1.5 text-[11px] outline-none" />
              </div>
              <div className="mb-3 flex items-center gap-2">
                <label className="text-[11px] text-ink-500">Colonne</label>
                <input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(+e.target.value)} className="h-6 w-14 rounded border border-border-1 px-1.5 text-[11px] outline-none" />
              </div>
              <button
                onClick={() => { editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(); setOpen(false) }}
                className="w-full rounded-[6px] bg-pink py-1.5 text-[11px] font-semibold text-white hover:bg-pink/90"
              >
                Inserisci tabella
              </button>
            </>
          ) : (
            <div className="space-y-1">
              <p className="mb-2 text-[11px] font-semibold text-ink-500">Modifica tabella</p>
              <button onClick={() => { editor?.chain().focus().addRowAfter().run(); setOpen(false) }} className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-ink-700 hover:bg-surface-2">
                <RowsIcon className="h-3.5 w-3.5" /> Aggiungi riga
              </button>
              <button onClick={() => { editor?.chain().focus().addColumnAfter().run(); setOpen(false) }} className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-ink-700 hover:bg-surface-2">
                <ColumnsIcon className="h-3.5 w-3.5" /> Aggiungi colonna
              </button>
              <button onClick={() => { editor?.chain().focus().deleteRow().run(); setOpen(false) }} className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-ink-700 hover:bg-surface-2">
                <Minus className="h-3.5 w-3.5" /> Rimuovi riga
              </button>
              <button onClick={() => { editor?.chain().focus().deleteColumn().run(); setOpen(false) }} className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-ink-700 hover:bg-surface-2">
                <Minus className="h-3.5 w-3.5" /> Rimuovi colonna
              </button>
              <div className="my-1 h-px bg-border-1" />
              <button onClick={() => { editor?.chain().focus().deleteTable().run(); setOpen(false) }} className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-red-500 hover:bg-red-50">
                <Trash className="h-3.5 w-3.5" /> Elimina tabella
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
