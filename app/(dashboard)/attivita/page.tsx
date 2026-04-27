import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getGoogleTasks, hasGoogleConnected } from "@/lib/actions/calendar"
import { AttivitaClient } from "@/components/pages/attivita-client"

export default async function AttivitaPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const googleConnected = await hasGoogleConnected()
  const tasks = googleConnected ? await getGoogleTasks(true) : []

  return (
    <AttivitaClient
      tasks={tasks}
      googleConnected={googleConnected}
    />
  )
}
