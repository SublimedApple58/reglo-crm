import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasGoogleConnected, getCalendarEvents, getSalesWithGoogle } from "@/lib/actions/calendar"
import { CalendarioClient } from "@/components/pages/calendario-client"
import { GoogleConnectCard } from "@/components/google-connect-card"

export default async function CalendarioPage() {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const googleConnected = await hasGoogleConnected()

  if (!googleConnected) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <GoogleConnectCard callbackUrl="/calendario" />
      </div>
    )
  }

  // Fetch current week events
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const [events, salesUsers] = await Promise.all([
    getCalendarEvents(startOfWeek.toISOString(), endOfWeek.toISOString()),
    getSalesWithGoogle(),
  ])

  const currentUser = {
    name: session.user.name ?? "Tu",
    color: (session.user as Record<string, unknown>).color as string | null,
  }

  return (
    <CalendarioClient initialEvents={events} userEmail={session.user.email} salesUsers={salesUsers} currentUser={currentUser} />
  )
}
