import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getNews, getNewsCategories } from "@/lib/actions/data"
import { BachecaClient } from "@/components/pages/bacheca-client"

export default async function BachecaPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const [newsItems, dbCategories] = await Promise.all([getNews(), getNewsCategories()])
  const categories = dbCategories.map((c) => ({ id: c.label, color: c.color ?? "#64748B" }))

  return <BachecaClient news={newsItems} userId={session.user.id} categories={categories} />
}
