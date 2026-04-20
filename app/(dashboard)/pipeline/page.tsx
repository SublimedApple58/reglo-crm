import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAutoscuole } from "@/lib/actions/autoscuole"
import { getSalesTeam } from "@/lib/actions/data"
import { PipelineClient } from "@/components/pages/pipeline-client"
import { STAGES } from "@/lib/constants"

export default async function PipelinePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const u = session.user as Record<string, unknown>
  const role = u.role as string
  const isAdmin = role === "admin" || role === "both"

  // Sales see only their assigned autoscuole
  const filters = isAdmin ? undefined : { assignedTo: u.id as string }
  const [results, team] = await Promise.all([getAutoscuole(filters), getSalesTeam()])

  const autoscuoleFlat = results.map((r) => ({
    ...r.autoscuola,
    stageName: r.stage.label,
    stageColor: r.stage.color,
    salesName: r.salesUser?.name ?? null,
  }))

  const salesUsers = team.map((t) => ({ id: t.user.id, name: t.user.name }))

  return <PipelineClient autoscuole={autoscuoleFlat} stages={[...STAGES]} salesUsers={salesUsers} isAdmin={isAdmin} />
}
