import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAutoscuole, getAllSalesTerritories, getSalesTerritories } from "@/lib/actions/autoscuole"
import { MapClient } from "@/components/pages/map-client"

export default async function MapPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const u = session.user as Record<string, unknown>
  const role = u.role as string
  const isAdmin = role === "admin" || role === "both"

  const filters = isAdmin ? undefined : { assignedTo: u.id as string }
  const [results, territories] = await Promise.all([
    getAutoscuole(filters),
    isAdmin ? getAllSalesTerritories() : getSalesTerritories(u.id as string),
  ])

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

  const salesTerritoryList = isAdmin
    ? (territories as { territory: { userId: string; region: string }; user: { id: string; name: string } }[]).map((t) => ({
        userId: t.territory.userId,
        region: t.territory.region,
        salesName: t.user.name,
        salesColor: autoscuoleFlat.find((a) => a.salesId === t.territory.userId)?.salesColor ?? "#94A3B8",
      }))
    : (territories as { userId: string; region: string }[]).map((t) => ({
        userId: t.userId,
        region: t.region,
        salesName: session.user.name ?? "",
        salesColor: "#EC4899",
      }))

  return <MapClient autoscuole={autoscuoleFlat} isAdmin={isAdmin} salesTerritories={salesTerritoryList} />
}
