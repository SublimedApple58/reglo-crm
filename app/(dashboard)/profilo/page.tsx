import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProfiloClient } from "@/components/pages/profilo-client"

export default async function ProfiloPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  return <ProfiloClient user={session.user} />
}
