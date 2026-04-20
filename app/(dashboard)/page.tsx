import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HomeClient } from "@/components/pages/home-client"
import { getPipelineCounts, getAutoscuole } from "@/lib/actions/autoscuole"
import { STAGES } from "@/lib/constants"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const u = session.user as Record<string, unknown>
  const role = u.role as string
  const isAdmin = role === "admin" || role === "both"

  const counts = await getPipelineCounts()
  const filters = isAdmin ? undefined : { assignedTo: u.id as string }
  const allAutoscuole = await getAutoscuole(filters)

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
    }))

  return (
    <HomeClient
      userName={session.user.name ?? ""}
      stagesWithCounts={stagesWithCounts}
      previewByStage={previewByStage}
      mapMarkers={mapMarkers}
      isAdmin={isAdmin}
    />
  )
}
