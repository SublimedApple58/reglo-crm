"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { oauthTokens, activities, autoscuole } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { getGoogleCalendarClient } from "@/lib/google/client"
import { revalidatePath } from "next/cache"

export async function hasGoogleConnected() {
  const session = await auth()
  if (!session?.user) return false

  const [token] = await db
    .select({ id: oauthTokens.id })
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.userId, session.user.id),
        eq(oauthTokens.provider, "google")
      )
    )
    .limit(1)

  return !!token
}

export async function getCalendarEvents(timeMin: string, timeMax: string) {
  const session = await auth()
  if (!session?.user) return []

  const calendar = await getGoogleCalendarClient(session.user.id)
  if (!calendar) return []

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    })

    const items = res.data.items ?? []

    // Bulk lookup: which events are linked to autoscuole via activities?
    const eventIds = items.map((e) => e.id!).filter(Boolean)
    let autoscuolaMap: Record<string, { id: string; name: string }> = {}
    if (eventIds.length > 0) {
      const linked = await db
        .select({
          calendarEventId: activities.calendarEventId,
          autoscuolaId: autoscuole.id,
          autoscuolaName: autoscuole.name,
        })
        .from(activities)
        .innerJoin(autoscuole, eq(activities.autoscuolaId, autoscuole.id))
        .where(inArray(activities.calendarEventId, eventIds))
      for (const row of linked) {
        if (row.calendarEventId) {
          autoscuolaMap[row.calendarEventId] = { id: row.autoscuolaId, name: row.autoscuolaName }
        }
      }
    }

    return items.map((event) => ({
      id: event.id!,
      title: event.summary ?? "(Senza titolo)",
      start: event.start?.dateTime ?? event.start?.date ?? "",
      end: event.end?.dateTime ?? event.end?.date ?? "",
      allDay: !event.start?.dateTime,
      meetLink:
        event.conferenceData?.entryPoints?.find(
          (e) => e.entryPointType === "video"
        )?.uri ?? null,
      htmlLink: event.htmlLink ?? null,
      attendees:
        event.attendees?.map((a) => ({
          email: a.email!,
          name: a.displayName ?? null,
          status: a.responseStatus ?? null,
          self: a.self ?? false,
        })) ?? [],
      description: event.description ?? null,
      autoscuola: autoscuolaMap[event.id!] ?? null,
    }))
  } catch {
    return []
  }
}

export async function createCalendarEvent(data: {
  title: string
  description?: string
  startDateTime: string
  endDateTime: string
  guests: string[]
  addMeetLink: boolean
  autoscuolaId?: string
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const calendar = await getGoogleCalendarClient(session.user.id)
  if (!calendar) throw new Error("Google non connesso")

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: data.addMeetLink ? 1 : 0,
    requestBody: {
      summary: data.title,
      description: data.description || undefined,
      start: { dateTime: data.startDateTime, timeZone: "Europe/Rome" },
      end: { dateTime: data.endDateTime, timeZone: "Europe/Rome" },
      attendees: data.guests
        .filter((g) => g.trim())
        .map((email) => ({ email: email.trim() })),
      conferenceData: data.addMeetLink
        ? {
            createRequest: {
              requestId: `reglo-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          }
        : undefined,
    },
  })

  const meetLink =
    event.data.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video"
    )?.uri ?? null

  // If associated with an autoscuola, create a CRM activity
  if (data.autoscuolaId) {
    await db.insert(activities).values({
      autoscuolaId: data.autoscuolaId,
      userId: session.user.id,
      type: "meeting",
      title: data.title,
      body: data.description || null,
      meetLink,
      calendarEventId: event.data.id ?? null,
      scheduledAt: new Date(data.startDateTime),
    })
    revalidatePath(`/autoscuola/${data.autoscuolaId}`)
  }

  return {
    eventId: event.data.id!,
    meetLink,
    htmlLink: event.data.htmlLink!,
  }
}

export async function updateCalendarEvent(eventId: string, data: {
  title?: string
  description?: string
  startDateTime?: string
  endDateTime?: string
  guests?: string[]
}) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const calendar = await getGoogleCalendarClient(session.user.id)
  if (!calendar) throw new Error("Google non connesso")

  const requestBody: Record<string, unknown> = {}
  if (data.title !== undefined) requestBody.summary = data.title
  if (data.description !== undefined) requestBody.description = data.description
  if (data.startDateTime) requestBody.start = { dateTime: data.startDateTime, timeZone: "Europe/Rome" }
  if (data.endDateTime) requestBody.end = { dateTime: data.endDateTime, timeZone: "Europe/Rome" }
  if (data.guests) requestBody.attendees = data.guests.filter((g) => g.trim()).map((email) => ({ email: email.trim() }))

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody,
  })
}

export async function deleteCalendarEvent(eventId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const calendar = await getGoogleCalendarClient(session.user.id)
  if (!calendar) throw new Error("Google non connesso")

  // Mark associated activities as cancelled before deleting
  const [activity] = await db
    .select({ id: activities.id, autoscuolaId: activities.autoscuolaId })
    .from(activities)
    .where(eq(activities.calendarEventId, eventId))
    .limit(1)

  if (activity) {
    await db
      .update(activities)
      .set({ status: "cancelled" })
      .where(eq(activities.calendarEventId, eventId))
    revalidatePath(`/autoscuola/${activity.autoscuolaId}`)
  }

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  })
}

export async function rsvpCalendarEvent(
  eventId: string,
  responseStatus: "accepted" | "declined" | "tentative"
) {
  const session = await auth()
  if (!session?.user) throw new Error("Non autorizzato")

  const calendar = await getGoogleCalendarClient(session.user.id)
  if (!calendar) throw new Error("Google non connesso")

  const event = await calendar.events.get({
    calendarId: "primary",
    eventId,
  })

  const attendees = event.data.attendees ?? []
  const userEmail = session.user.email
  const updated = attendees.map((a) =>
    a.email === userEmail || a.self ? { ...a, responseStatus } : a
  )

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: { attendees: updated },
  })
}
