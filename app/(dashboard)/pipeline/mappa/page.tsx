import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAutoscuole } from "@/lib/actions/autoscuole"
import { MapClient } from "@/components/pages/map-client"

export default async function MapPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const results = await getAutoscuole()

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
  }))

  return <MapClient autoscuole={autoscuoleFlat} />
}
