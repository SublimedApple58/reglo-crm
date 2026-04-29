import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getHomeCards, getResources } from "@/lib/actions/data"
import { GestioneHomeClient } from "@/components/pages/admin/gestione-home-client"

export default async function GestioneHomePage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") redirect("/")

  const [cards, resources] = await Promise.all([getHomeCards(), getResources()])

  return <GestioneHomeClient cards={cards} resources={resources.map((r) => ({ id: r.id, title: r.title, category: r.category }))} />
}
