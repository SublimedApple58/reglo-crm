import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAutoscuole } from "@/lib/actions/autoscuole"
import { MapClient } from "@/components/pages/map-client"

export default async function MapPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const u = session.user as Record<string, unknown>
  const role = u.role as string
  const isAdmin = role === "admin" || role === "both"

  const filters = isAdmin ? undefined : { assignedTo: u.id as string }
  const results = await getAutoscuole(filters)

  const autoscuoleFlat = results.map((r) => ({
    id: r.autoscuola.id,
    name: r.autoscuola.name,
    province: r.autoscuola.province,
    town: r.autoscuola.town,
    stageId: r.autoscuola.stageId,
    lat: r.autoscuola.lat,
    lng: r.autoscuola.lng,
    stageColor: r.stage.color,
    stageLabel: r.stage.label,
    pipelineValue: r.autoscuola.pipelineValue,
    students: r.autoscuola.students,
    salesName: r.salesUser?.name ?? null,
    salesId: r.salesUser?.id ?? null,
    salesColor: r.salesUser?.color ?? null,
  }))

  return <MapClient autoscuole={autoscuoleFlat} isAdmin={isAdmin} />
}
