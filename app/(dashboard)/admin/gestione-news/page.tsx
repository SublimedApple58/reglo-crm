import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getNews } from "@/lib/actions/data"
import { GestioneNewsClient } from "@/components/pages/admin/gestione-news-client"

export default async function GestioneNewsPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const role = (session.user as Record<string, unknown>).role as string
  if (role !== "admin" && role !== "both") redirect("/")

  const news = await getNews()

  return <GestioneNewsClient news={news} userId={session.user.id} />
}
