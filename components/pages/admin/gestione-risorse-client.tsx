"use client"

import { useState, useTransition } from "react"
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
  RemoveFormatting,
} from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExt from "@tiptap/extension-underline"
import LinkExt from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import { TextStyle } from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Placeholder from "@tiptap/extension-placeholder"
import { RESOURCE_CATEGORIES } from "@/lib/constants"
import { upsertResource, deleteResource } from "@/lib/actions/data"
import type { Resource } from "@/lib/db/schema"

export function GestioneRisorseClient({ resources: initial }: { resources: Resource[] }) {
  const router = useRouter()
  const [resources, setResources] = useState(initial)
  const [selectedId, setSelectedId] = useState<number | null>(resources[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [modified, setModified] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)

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
      LinkExt.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: "Inizia a scrivere..." }),
    ],
    content: selected?.html ?? "",
    onUpdate: () => setModified(true),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[300px] focus:outline-none text-[14px] leading-relaxed text-ink-700 [&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_a]:text-pink [&_a]:underline [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_table]:border-collapse [&_table]:my-4 [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_hr]:my-4 [&_hr]:border-border-1",
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
              <ToolbarBtn icon={Undo2} action={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} />
              <ToolbarBtn icon={Redo2} action={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Headings */}
              <ToolbarBtn icon={Heading1} action={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} />
              <ToolbarBtn icon={Heading2} action={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} />
              <ToolbarBtn icon={Heading3} action={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Inline formatting */}
              <ToolbarBtn icon={Bold} action={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} />
              <ToolbarBtn icon={Italic} action={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} />
              <ToolbarBtn icon={Underline} action={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} />
              <ToolbarBtn icon={Strikethrough} action={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} />
              <ToolbarBtn icon={Code} action={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive("code")} />
              <ToolbarBtn icon={Highlighter} action={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive("highlight")} />
              <ToolbarBtn icon={RemoveFormatting} action={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Alignment */}
              <ToolbarBtn icon={AlignLeft} action={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} />
              <ToolbarBtn icon={AlignCenter} action={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} />
              <ToolbarBtn icon={AlignRight} action={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Block elements */}
              <ToolbarBtn icon={List} action={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} />
              <ToolbarBtn icon={ListOrdered} action={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} />
              <ToolbarBtn icon={Quote} action={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} />
              <ToolbarBtn icon={Minus} action={() => editor?.chain().focus().setHorizontalRule().run()} />
              <div className="mx-1 h-5 w-px bg-border-1" />
              {/* Link */}
              <ToolbarBtn
                icon={Link2}
                active={editor?.isActive("link")}
                action={() => {
                  if (editor?.isActive("link")) {
                    editor?.chain().focus().unsetLink().run()
                  } else {
                    const url = window.prompt("URL:")
                    if (url) editor?.chain().focus().setLink({ href: url }).run()
                  }
                }}
              />
              {/* Table */}
              <ToolbarBtn
                icon={TableIcon}
                action={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              />
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
              className="prose prose-sm max-w-none text-[14px] leading-relaxed text-ink-700 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:mb-1 [&_ol]:my-3 [&_ol]:pl-5 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_table]:my-4 [&_table]:border-collapse [&_td]:border [&_td]:border-border-1 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border-1 [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
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
}: {
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={action}
      disabled={disabled}
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
