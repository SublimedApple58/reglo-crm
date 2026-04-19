import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSalesTeam, getAdminStats } from "@/lib/actions/data"
import { GestioneSalesClient } from "@/components/pages/admin/gestione-sales-client"

export default async function GestioneSalesPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") redirect("/")

  const [team, stats] = await Promise.all([getSalesTeam(), getAdminStats()])

  return <GestioneSalesClient team={team} stats={stats} />
}
