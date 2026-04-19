/**
 * Import real Italian driving schools via Google Places API (Text Search).
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY=xxx npx tsx scripts/import-autoscuole.ts
 *
 * Requires:
 *   - DATABASE_URL in .env.local (loaded automatically if present)
 *   - GOOGLE_MAPS_API_KEY env var with Places API enabled
 */

// Load .env.local manually
import { readFileSync, existsSync } from "fs"
import { join } from "path"
const envPath = join(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "../lib/db/schema"

const API_KEY = process.env.GOOGLE_MAPS_API_KEY
if (!API_KEY) {
  console.error("❌ GOOGLE_MAPS_API_KEY is required")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

// All Italian province capitals (~107)
const PROVINCE_CAPITALS: { name: string; province: string }[] = [
  // Abruzzo
  { name: "L'Aquila", province: "AQ" },
  { name: "Chieti", province: "CH" },
  { name: "Pescara", province: "PE" },
  { name: "Teramo", province: "TE" },
  // Basilicata
  { name: "Matera", province: "MT" },
  { name: "Potenza", province: "PZ" },
  // Calabria
  { name: "Catanzaro", province: "CZ" },
  { name: "Cosenza", province: "CS" },
  { name: "Crotone", province: "KR" },
  { name: "Reggio Calabria", province: "RC" },
  { name: "Vibo Valentia", province: "VV" },
  // Campania
  { name: "Avellino", province: "AV" },
  { name: "Benevento", province: "BN" },
  { name: "Caserta", province: "CE" },
  { name: "Napoli", province: "NA" },
  { name: "Salerno", province: "SA" },
  // Emilia-Romagna
  { name: "Bologna", province: "BO" },
  { name: "Ferrara", province: "FE" },
  { name: "Forlì", province: "FC" },
  { name: "Modena", province: "MO" },
  { name: "Parma", province: "PR" },
  { name: "Piacenza", province: "PC" },
  { name: "Ravenna", province: "RA" },
  { name: "Reggio Emilia", province: "RE" },
  { name: "Rimini", province: "RN" },
  // Friuli Venezia Giulia
  { name: "Gorizia", province: "GO" },
  { name: "Pordenone", province: "PN" },
  { name: "Trieste", province: "TS" },
  { name: "Udine", province: "UD" },
  // Lazio
  { name: "Frosinone", province: "FR" },
  { name: "Latina", province: "LT" },
  { name: "Rieti", province: "RI" },
  { name: "Roma", province: "RM" },
  { name: "Viterbo", province: "VT" },
  // Liguria
  { name: "Genova", province: "GE" },
  { name: "Imperia", province: "IM" },
  { name: "La Spezia", province: "SP" },
  { name: "Savona", province: "SV" },
  // Lombardia
  { name: "Bergamo", province: "BG" },
  { name: "Brescia", province: "BS" },
  { name: "Como", province: "CO" },
  { name: "Cremona", province: "CR" },
  { name: "Lecco", province: "LC" },
  { name: "Lodi", province: "LO" },
  { name: "Mantova", province: "MN" },
  { name: "Milano", province: "MI" },
  { name: "Monza", province: "MB" },
  { name: "Pavia", province: "PV" },
  { name: "Sondrio", province: "SO" },
  { name: "Varese", province: "VA" },
  // Marche
  { name: "Ancona", province: "AN" },
  { name: "Ascoli Piceno", province: "AP" },
  { name: "Fermo", province: "FM" },
  { name: "Macerata", province: "MC" },
  { name: "Pesaro", province: "PU" },
  // Molise
  { name: "Campobasso", province: "CB" },
  { name: "Isernia", province: "IS" },
  // Piemonte
  { name: "Alessandria", province: "AL" },
  { name: "Asti", province: "AT" },
  { name: "Biella", province: "BI" },
  { name: "Cuneo", province: "CN" },
  { name: "Novara", province: "NO" },
  { name: "Torino", province: "TO" },
  { name: "Verbania", province: "VB" },
  { name: "Vercelli", province: "VC" },
  // Puglia
  { name: "Bari", province: "BA" },
  { name: "Barletta", province: "BT" },
  { name: "Brindisi", province: "BR" },
  { name: "Foggia", province: "FG" },
  { name: "Lecce", province: "LE" },
  { name: "Taranto", province: "TA" },
  // Sardegna
  { name: "Cagliari", province: "CA" },
  { name: "Nuoro", province: "NU" },
  { name: "Oristano", province: "OR" },
  { name: "Sassari", province: "SS" },
  { name: "Sud Sardegna", province: "SU" },
  // Sicilia
  { name: "Agrigento", province: "AG" },
  { name: "Caltanissetta", province: "CL" },
  { name: "Catania", province: "CT" },
  { name: "Enna", province: "EN" },
  { name: "Messina", province: "ME" },
  { name: "Palermo", province: "PA" },
  { name: "Ragusa", province: "RG" },
  { name: "Siracusa", province: "SR" },
  { name: "Trapani", province: "TP" },
  // Toscana
  { name: "Arezzo", province: "AR" },
  { name: "Firenze", province: "FI" },
  { name: "Grosseto", province: "GR" },
  { name: "Livorno", province: "LI" },
  { name: "Lucca", province: "LU" },
  { name: "Massa", province: "MS" },
  { name: "Pisa", province: "PI" },
  { name: "Pistoia", province: "PT" },
  { name: "Prato", province: "PO" },
  { name: "Siena", province: "SI" },
  // Trentino-Alto Adige
  { name: "Bolzano", province: "BZ" },
  { name: "Trento", province: "TN" },
  // Umbria
  { name: "Perugia", province: "PG" },
  { name: "Terni", province: "TR" },
  // Valle d'Aosta
  { name: "Aosta", province: "AO" },
  // Veneto
  { name: "Belluno", province: "BL" },
  { name: "Padova", province: "PD" },
  { name: "Rovigo", province: "RO" },
  { name: "Treviso", province: "TV" },
  { name: "Venezia", province: "VE" },
  { name: "Verona", province: "VR" },
  { name: "Vicenza", province: "VI" },
]

interface PlaceResult {
  displayName?: { text?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  location?: { latitude?: number; longitude?: number }
  id?: string
}

interface PlacesResponse {
  places?: PlaceResult[]
  nextPageToken?: string
}

async function searchPlaces(query: string, pageToken?: string): Promise<PlacesResponse> {
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "it",
    regionCode: "IT",
    maxResultCount: 20,
  }
  if (pageToken) {
    body.pageToken = pageToken
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY!,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location,places.id,nextPageToken",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`API error (${res.status}): ${text}`)
    return { places: [] }
  }

  return res.json()
}

function extractTownFromAddress(address: string): string {
  // Italian addresses typically: "Via X, CAP Town Province, Italy"
  const parts = address.split(",").map((p) => p.trim())
  if (parts.length >= 3) {
    // Second-to-last part before "Italy" usually contains "CAP Town"
    const townPart = parts[parts.length - 3] || parts[parts.length - 2]
    // Remove CAP (5 digits)
    return townPart.replace(/^\d{5}\s*/, "").trim()
  }
  return parts[1]?.replace(/^\d{5}\s*/, "").trim() ?? address
}

// Track seen place IDs to avoid duplicates
const seenPlaceIds = new Set<string>()
let totalInserted = 0

async function importProvince(capital: { name: string; province: string }) {
  const query = `autoscuola ${capital.name}`
  let pageToken: string | undefined
  let pageCount = 0
  const maxPages = 3 // max 60 results per province

  do {
    const data = await searchPlaces(query, pageToken)
    const places = data.places ?? []

    if (places.length === 0) break

    const toInsert = []
    for (const place of places) {
      const placeId = place.id
      if (!placeId || seenPlaceIds.has(placeId)) continue
      seenPlaceIds.add(placeId)

      const name = place.displayName?.text ?? "Autoscuola"
      const address = place.formattedAddress ?? ""
      const town = extractTownFromAddress(address)
      const phone = place.nationalPhoneNumber ?? null
      const lat = place.location?.latitude ?? null
      const lng = place.location?.longitude ?? null

      toInsert.push({
        id: `as_${placeId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}_${Date.now()}`,
        name,
        owner: null,
        province: capital.province,
        town,
        phone,
        email: null,
        stageId: "da_chiamare",
        pipelineValue: 0,
        assignedTo: null,
        students: 0,
        lastContact: 0,
        lat,
        lng,
        address,
      })
    }

    if (toInsert.length > 0) {
      // Insert in batches of 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50)
        await db.insert(schema.autoscuole).values(batch)
      }
      totalInserted += toInsert.length
    }

    pageToken = data.nextPageToken
    pageCount++

    // Respect API rate limits
    if (pageToken) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  } while (pageToken && pageCount < maxPages)
}

async function main() {
  console.log(`🚀 Starting import for ${PROVINCE_CAPITALS.length} provinces...`)
  console.log("")

  for (let i = 0; i < PROVINCE_CAPITALS.length; i++) {
    const capital = PROVINCE_CAPITALS[i]
    process.stdout.write(`[${i + 1}/${PROVINCE_CAPITALS.length}] ${capital.name} (${capital.province})... `)

    try {
      await importProvince(capital)
      console.log(`✅ (total: ${totalInserted})`)
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : err}`)
    }

    // Rate limit: ~0.5s between provinces
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log("")
  console.log(`🎉 Import complete! Total autoscuole: ${totalInserted}`)
}

main().catch(console.error)
