"use server"

export type LinkPreviewData = {
  url: string
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "bot" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    })
    if (!res.ok) return null

    const html = await res.text()

    const get = (property: string): string | null => {
      // Match both property="" and name="" variants
      const re = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        "i"
      )
      const m = html.match(re)
      return m?.[1] ?? m?.[2] ?? null
    }

    const title = get("og:title") ?? get("twitter:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null
    const description = get("og:description") ?? get("twitter:description") ?? get("description")
    const image = get("og:image") ?? get("twitter:image")
    const siteName = get("og:site_name")

    if (!title && !description && !image) return null

    return { url, title, description, image, siteName }
  } catch {
    return null
  }
}
