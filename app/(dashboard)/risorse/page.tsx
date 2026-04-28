import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getResources, getResourceCategories } from "@/lib/actions/data"
import { RisorseClient } from "@/components/pages/risorse-client"

export default async function RisorsePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const [resources, dbCategories] = await Promise.all([getResources(), getResourceCategories()])
  const categories = dbCategories.map((c) => ({ id: c.label, label: c.label, icon: c.icon ?? "file-text", color: c.color ?? "#64748B" }))

  return <RisorseClient resources={resources} userId={session.user.id} categories={categories} />
}
