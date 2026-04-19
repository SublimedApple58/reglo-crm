import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCommissions, getCommissionLines } from "@/lib/actions/data"
import { getUser } from "@/lib/actions/users"
import { CommissioniClient } from "@/components/pages/commissioni-client"

export default async function CommissioniPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const [commissions, user] = await Promise.all([
    getCommissions(session.user.id),
    getUser(session.user.id),
  ])

  const currentMonth = commissions[commissions.length - 1]

  let lines: Awaited<ReturnType<typeof getCommissionLines>> = []
  if (currentMonth) {
    lines = await getCommissionLines(currentMonth.id)
  }

  return (
    <CommissioniClient
      commissions={commissions}
      currentMonth={currentMonth ?? null}
      lines={lines}
      quota={user?.quota ?? 5750}
    />
  )
}
