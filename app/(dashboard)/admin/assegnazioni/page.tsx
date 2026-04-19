import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAutoscuole } from "@/lib/actions/autoscuole"
import { getSalesTeam } from "@/lib/actions/data"
import { AssegnazioniClient } from "@/components/pages/admin/assegnazioni-client"

export default async function AssegnazioniPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") redirect("/")

  const [results, team] = await Promise.all([getAutoscuole(), getSalesTeam()])

  const autoscuoleFlat = results.map((r) => ({
    id: r.autoscuola.id,
    name: r.autoscuola.name,
    province: r.autoscuola.province,
    town: r.autoscuola.town,
    stageId: r.autoscuola.stageId,
    assignedTo: r.autoscuola.assignedTo,
    salesName: r.salesUser?.name ?? null,
  }))

  const salesOptions = team.map((t) => ({
    id: t.user.id,
    name: t.user.name,
    territory: t.user.territory ?? "",
    color: t.user.color,
    count: t.autoscuoleCount,
  }))

  return <AssegnazioniClient autoscuole={autoscuoleFlat} salesOptions={salesOptions} />
}
