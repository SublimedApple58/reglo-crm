import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HomeClient } from "@/components/pages/home-client"
import { getPipelineCounts, getAutoscuole } from "@/lib/actions/autoscuole"
import { STAGES } from "@/lib/constants"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const counts = await getPipelineCounts()
  const allAutoscuole = await getAutoscuole({ assignedTo: session.user.id })

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

  return (
    <HomeClient
      userName={session.user.name}
      stagesWithCounts={stagesWithCounts}
      previewByStage={previewByStage}
    />
  )
}
