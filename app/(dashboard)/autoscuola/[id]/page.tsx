import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getAutoscuola, getActivities } from "@/lib/actions/autoscuole"
import { getDocuments } from "@/lib/actions/documents"
import { AutoscuolaClient } from "@/components/pages/autoscuola-client"
import { STAGES } from "@/lib/constants"

export default async function AutoscuolaPage(props: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const { id } = await props.params

  const result = await getAutoscuola(id)
  if (!result) notFound()

  const activitiesResult = await getActivities(id)
  const documentsResult = await getDocuments(id)

  const activitiesFlat = activitiesResult.map((a) => ({
    ...a.activity,
    userName: a.user.name,
    userColor: a.user.color,
    userInitials: a.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
  }))

  return (
    <AutoscuolaClient
      autoscuola={result.autoscuola}
      stage={result.stage}
      salesUser={result.salesUser}
      activities={activitiesFlat}
      stages={[...STAGES]}
      documents={documentsResult}
    />
  )
}
