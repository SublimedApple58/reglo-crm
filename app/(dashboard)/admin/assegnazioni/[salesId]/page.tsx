import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getSalesTerritories, getAutoscuoleBySales } from "@/lib/actions/autoscuole"
import { SalesDetailClient } from "@/components/pages/admin/sales-detail-client"
import { REGIONI_PROVINCE } from "@/lib/constants"

export default async function SalesDetailPage({ params }: { params: Promise<{ salesId: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") redirect("/")

  const { salesId } = await params

  const [salesUser] = await db.select().from(users).where(eq(users.id, salesId)).limit(1)
  if (!salesUser) redirect("/admin/assegnazioni")

  const [territories, autoscuoleData] = await Promise.all([
    getSalesTerritories(salesId),
    getAutoscuoleBySales(salesId),
  ])

  const autoscuole = autoscuoleData.map((r) => ({
    id: r.autoscuola.id,
    name: r.autoscuola.name,
    town: r.autoscuola.town,
    province: r.autoscuola.province,
    stageId: r.autoscuola.stageId,
    stageLabel: r.stage.label,
    stageColor: r.stage.color,
  }))

  const assignedRegions = territories.map((t) => t.region)
  const allRegions = Object.keys(REGIONI_PROVINCE).sort()

  return (
    <SalesDetailClient
      sales={salesUser}
      assignedRegions={assignedRegions}
      allRegions={allRegions}
      autoscuole={autoscuole}
    />
  )
}
