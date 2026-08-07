"use client"

import { useEffect, useState } from "react"

const URL_REGEX = /https?:\/\/[^\s<>)"']+/g

export function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // YouTube
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1).split("/")[0]}`
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`
    // Vimeo
    const vimeoMatch = u.hostname.includes("vimeo.com") && u.pathname.match(/\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    // Loom
    if (u.hostname.includes("loom.com") && u.pathname.startsWith("/share/")) return `https://www.loom.com/embed/${u.pathname.replace("/share/", "")}`
  } catch {}
  return null
}

export function Linkify({ text, embeds = true }: { text: string; embeds?: boolean }) {
  const parts: (string | { url: string; key: number })[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push({ url: match[0], key: key++ })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return (
    <>
      {parts.map((part) => {
        if (typeof part === "string") return part
        if (embeds) {
          const embedUrl = getEmbedUrl(part.url)
          if (embedUrl) {
            return (
              <span key={part.key} className="my-2 block">
                <iframe
                  src={embedUrl}
                  className="w-full rounded-[10px]"
                  style={{ aspectRatio: "16/9" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </span>
            )
          }
        }
        return <LinkPreviewCard key={part.key} url={part.url} embeds={embeds} />
      })}
    </>
  )
}

function LinkPreviewCard({ url, embeds }: { url: string; embeds: boolean }) {
  const [preview, setPreview] = useState<{ title: string | null; description: string | null; image: string | null; siteName: string | null } | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!embeds) return
    let cancelled = false
    import("@/lib/actions/link-preview").then(({ fetchLinkPreview }) =>
      fetchLinkPreview(url).then((data) => {
        if (!cancelled) {
          setPreview(data)
          setLoaded(true)
        }
      })
    )
    return () => { cancelled = true }
  }, [url, embeds])

  // Loading, disabled previews, or no OG data — plain link
  if (!loaded || !preview) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand underline decoration-brand/40 hover:decoration-brand">
        {url}
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 flex overflow-hidden rounded-[10px] border border-border-1 bg-surface-2/50 transition-colors hover:bg-surface-2"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          className="h-[90px] w-[120px] shrink-0 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
        />
      )}
      <div className="flex min-w-0 flex-col justify-center px-3 py-2">
        {preview.siteName && (
          <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">{preview.siteName}</p>
        )}
        {preview.title && (
          <p className="truncate text-[12.5px] font-semibold text-ink-900">{preview.title}</p>
        )}
        {preview.description && (
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-500">{preview.description}</p>
        )}
      </div>
    </a>
  )
}
