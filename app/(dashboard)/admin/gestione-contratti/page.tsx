import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getContractRequests } from "@/lib/actions/contracts"
import { GestioneContrattiClient } from "@/components/pages/admin/gestione-contratti-client"

export default async function GestioneContrattiPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") redirect("/")

  const requests = await getContractRequests()

  return <GestioneContrattiClient requests={requests} />
}
