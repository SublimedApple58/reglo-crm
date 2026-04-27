import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HomeClient } from "@/components/pages/home-client"
import { getPipelineCounts, getAutoscuole } from "@/lib/actions/autoscuole"
import { getHomeCards } from "@/lib/actions/data"
import { hasGoogleConnected, getCalendarEvents, getGoogleTasks } from "@/lib/actions/calendar"
import { STAGES } from "@/lib/constants"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const u = session.user as Record<string, unknown>
  const role = u.role as string
  const isAdmin = role === "admin" || role === "both"

  const [counts, homeCards, googleConnected] = await Promise.all([
    getPipelineCounts(),
    getHomeCards(),
    hasGoogleConnected(),
  ])
  const filters = isAdmin ? undefined : { assignedTo: u.id as string }
  const allAutoscuole = await getAutoscuole(filters)

  // Fetch tasks if Google connected
  const googleTasks = googleConnected ? await getGoogleTasks() : []

  // Fetch upcoming events if Google connected
  let upcomingEvents: { title: string; start: string; meetLink: string | null; location: string | null }[] = []
  if (googleConnected) {
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setDate(endOfDay.getDate() + 7) // next 7 days
    const events = await getCalendarEvents(now.toISOString(), endOfDay.toISOString())

    // Build day→location map from all-day events (working location like "Casa", "Ufficio")
    const locationByDay: Record<string, string> = {}
    for (const e of events) {
      if (e.allDay) {
        const day = e.start.split("T")[0]
        locationByDay[day] = e.title
      }
    }

    upcomingEvents = events.filter((e) => !e.allDay).slice(0, 5).map((e) => {
      const day = e.start.split("T")[0]
      return {
        title: e.title,
        start: e.start,
        meetLink: e.meetLink,
        location: locationByDay[day] ?? null,
      }
    })
  }

  const stagesWithCounts = STAGES.map((s) => ({
    ...s,
    count: counts.find((c) => c.stageId === s.id)?.count ?? 0,
  }))

  // Get first 3 autoscuole per stage for preview
  const previewByStage = STAGES.slice(0, 5).map((stage) => ({
    ...stage,
    count: counts.find((c) => c.stageId === stage.id)?.count ?? 0,
    items: allAutoscuole
      .filter((a) => a.autoscuola.stageId === stage.id)
      .slice(0, 3)
      .map((a) => a.autoscuola),
  }))

  // Map markers for preview
  const mapMarkers = allAutoscuole
    .filter((r) => r.autoscuola.lat && r.autoscuola.lng)
    .map((r) => ({
      lat: r.autoscuola.lat!,
      lng: r.autoscuola.lng!,
      color: r.stage.color,
      province: r.autoscuola.province,
    }))

  return (
    <HomeClient
      userName={session.user.name ?? ""}
      stagesWithCounts={stagesWithCounts}
      previewByStage={previewByStage}
      mapMarkers={mapMarkers}
      isAdmin={isAdmin}
      homeCards={homeCards}
      googleConnected={googleConnected}
      upcomingEvents={upcomingEvents}
      googleTasks={googleTasks}
    />
  )
}
