import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getResources } from "@/lib/actions/data"
import { GestioneRisorseClient } from "@/components/pages/admin/gestione-risorse-client"

export default async function GestioneRisorsePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") redirect("/")

  const resources = await getResources()
  return <GestioneRisorseClient resources={resources} />
}
