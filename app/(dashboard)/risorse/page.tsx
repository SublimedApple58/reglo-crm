import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getResources } from "@/lib/actions/data"
import { RisorseClient } from "@/components/pages/risorse-client"

export default async function RisorsePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const resources = await getResources()
  return <RisorseClient resources={resources} />
}
