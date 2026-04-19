import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getNews } from "@/lib/actions/data"
import { BachecaClient } from "@/components/pages/bacheca-client"

export default async function BachecaPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const newsItems = await getNews()
  return <BachecaClient news={newsItems} />
}
