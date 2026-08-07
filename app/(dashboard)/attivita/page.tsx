import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getGoogleTasks, hasGoogleConnected } from "@/lib/actions/calendar"
import { getAutoscuolePhoneMap } from "@/lib/actions/autoscuole"
import { AttivitaClient } from "@/components/pages/attivita-client"

export default async function AttivitaPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const googleConnected = await hasGoogleConnected()
  const tasks = googleConnected ? await getGoogleTasks(true) : []

  // I task follow-up portano "Link CRM: …/autoscuola/{id}" nelle notes: risolvi i telefoni in batch
  const autoscuolaIds = tasks
    .map((t) => t.notes?.match(/\/autoscuola\/([^\s]+)/)?.[1])
    .filter((id): id is string => Boolean(id))
  const phoneMap = await getAutoscuolePhoneMap(autoscuolaIds)

  return (
    <AttivitaClient
      tasks={tasks}
      googleConnected={googleConnected}
      phoneMap={phoneMap}
    />
  )
}
