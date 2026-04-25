/**
 * Import autoscuole by searching individual Italian municipalities (comuni > 15k pop).
 * This catches autoscuole that the capoluogo-only search missed due to Google's 60-result limit.
 */

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
}

import { neon } from "@neondatabase/serverless"

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
if (!API_KEY) { console.error("❌ API key required"); process.exit(1) }

const sql = neon(process.env.DATABASE_URL!)

const KEYWORDS = ["autoscuola", "scuola guida"]

// ~800 Italian comuni > 15k inhabitants (excluding capitals already searched)
// Format: [name, province_code]
const COMUNI: [string, string][] = [
  // Abruzzo
  ["Avezzano","AQ"],["Sulmona","AQ"],["Lanciano","CH"],["Vasto","CH"],["Ortona","CH"],["San Giovanni Teatino","CH"],["Francavilla al Mare","CH"],["Montesilvano","PE"],["Spoltore","PE"],["Roseto degli Abruzzi","TE"],["Giulianova","TE"],["Martinsicuro","TE"],["Alba Adriatica","TE"],
  // Basilicata
  ["Melfi","PZ"],["Pisticci","MT"],["Policoro","MT"],["Bernalda","MT"],
  // Calabria
  ["Lamezia Terme","CZ"],["Rende","CS"],["Castrovillari","CS"],["Corigliano-Rossano","CS"],["Gioia Tauro","RC"],["Siderno","RC"],["Palmi","RC"],
  // Campania
  ["Giugliano in Campania","NA"],["Torre del Greco","NA"],["Pozzuoli","NA"],["Castellammare di Stabia","NA"],["Portici","NA"],["Ercolano","NA"],["Torre Annunziata","NA"],["Marano di Napoli","NA"],["Afragola","NA"],["Acerra","NA"],["Nola","NA"],["Aversa","CE"],["Marcianise","CE"],["Maddaloni","CE"],["Mondragone","CE"],["Santa Maria Capua Vetere","CE"],["Battipaglia","SA"],["Cava de' Tirreni","SA"],["Nocera Inferiore","SA"],["Scafati","SA"],["Eboli","SA"],["Pagani","SA"],["Sarno","SA"],["Ariano Irpino","AV"],
  // Emilia-Romagna
  ["Imola","BO"],["Casalecchio di Reno","BO"],["San Lazzaro di Savena","BO"],["Castel San Pietro Terme","BO"],["Carpi","MO"],["Sassuolo","MO"],["Formigine","MO"],["Castelfranco Emilia","MO"],["Fidenza","PR"],["Correggio","RE"],["Scandiano","RE"],["Guastalla","RE"],["Cesena","FC"],["Faenza","RA"],["Lugo","RA"],["Cervia","RA"],["Cattolica","RN"],["Riccione","RN"],["Santarcangelo di Romagna","RN"],["Cento","FE"],["Comacchio","FE"],
  // Friuli Venezia Giulia
  ["Monfalcone","GO"],["Sacile","PN"],["Codroipo","UD"],["Cervignano del Friuli","UD"],["Muggia","TS"],
  // Lazio
  ["Guidonia Montecelio","RM"],["Fiumicino","RM"],["Tivoli","RM"],["Pomezia","RM"],["Velletri","RM"],["Aprilia","LT"],["Anzio","RM"],["Nettuno","RM"],["Ciampino","RM"],["Monterotondo","RM"],["Ladispoli","RM"],["Civitavecchia","RM"],["Cerveteri","RM"],["Albano Laziale","RM"],["Ardea","RM"],["Marino","RM"],["Genzano di Roma","RM"],["Fonte Nuova","RM"],["Mentana","RM"],["Palestrina","RM"],["Colleferro","RM"],["Formia","LT"],["Terracina","LT"],["Fondi","LT"],["Cisterna di Latina","LT"],["Cassino","FR"],["Alatri","FR"],
  // Liguria
  ["Sanremo","IM"],["Ventimiglia","IM"],["Rapallo","GE"],["Chiavari","GE"],["Sestri Levante","GE"],["Sarzana","SP"],["Albenga","SV"],
  // Lombardia
  ["Seregno","MB"],["Desio","MB"],["Lissone","MB"],["Brugherio","MB"],["Cesano Maderno","MB"],["Legnano","MI"],["Rho","MI"],["Cinisello Balsamo","MI"],["Sesto San Giovanni","MI"],["Cologno Monzese","MI"],["Paderno Dugnano","MI"],["Pioltello","MI"],["Bollate","MI"],["Rozzano","MI"],["Corsico","MI"],["San Giuliano Milanese","MI"],["Cernusco sul Naviglio","MI"],["Buccinasco","MI"],["Abbiategrasso","MI"],["Magenta","MI"],["Treviglio","BG"],["Seriate","BG"],["Dalmine","BG"],["Romano di Lombardia","BG"],["Desenzano del Garda","BS"],["Lumezzane","BS"],["Montichiari","BS"],["Palazzolo sull'Oglio","BS"],["Cantù","CO"],["Erba","CO"],["Mariano Comense","CO"],["Busto Arsizio","VA"],["Gallarate","VA"],["Saronno","VA"],["Tradate","VA"],["Castellanza","VA"],["Vigevano","PV"],["Voghera","PV"],["Crema","CR"],["Castiglione delle Stiviere","MN"],
  // Marche
  ["Senigallia","AN"],["Jesi","AN"],["Fabriano","AN"],["Osimo","AN"],["Civitanova Marche","MC"],["Recanati","MC"],["San Benedetto del Tronto","AP"],["Fano","PU"],["Urbino","PU"],
  // Molise
  ["Termoli","CB"],
  // Piemonte
  ["Moncalieri","TO"],["Rivoli","TO"],["Collegno","TO"],["Nichelino","TO"],["Settimo Torinese","TO"],["Grugliasco","TO"],["Chieri","TO"],["Pinerolo","TO"],["Venaria Reale","TO"],["Chivasso","TO"],["Ivrea","TO"],["Borgomanero","NO"],["Casale Monferrato","AL"],["Tortona","AL"],["Novi Ligure","AL"],["Alba","CN"],["Bra","CN"],["Fossano","CN"],
  // Puglia
  ["Altamura","BA"],["Molfetta","BA"],["Corato","BA"],["Bitonto","BA"],["Monopoli","BA"],["Gravina in Puglia","BA"],["Modugno","BA"],["Andria","BT"],["Bisceglie","BT"],["Trani","BT"],["San Severo","FG"],["Cerignola","FG"],["Manfredonia","FG"],["Nardò","LE"],["Galatina","LE"],["Copertino","LE"],["Martina Franca","TA"],["Massafra","TA"],["Grottaglie","TA"],["Fasano","BR"],["Francavilla Fontana","BR"],["Ostuni","BR"],
  // Sardegna
  ["Quartu Sant'Elena","CA"],["Selargius","CA"],["Assemini","CA"],["Alghero","SS"],["Olbia","SS"],["Tempio Pausania","SS"],["Porto Torres","SS"],["Carbonia","SU"],["Iglesias","SU"],["Villacidro","SU"],
  // Sicilia
  ["Marsala","TP"],["Alcamo","TP"],["Mazara del Vallo","TP"],["Bagheria","PA"],["Carini","PA"],["Monreale","PA"],["Partinico","PA"],["Termini Imerese","PA"],["Acireale","CT"],["Misterbianco","CT"],["Paternò","CT"],["Adrano","CT"],["Caltagirone","CT"],["Giarre","CT"],["Gela","CL"],["Modica","RG"],["Vittoria","RG"],["Comiso","RG"],["Augusta","SR"],["Lentini","SR"],["Milazzo","ME"],["Barcellona Pozzo di Gotto","ME"],["Canicattì","AG"],["Licata","AG"],["Favara","AG"],["Piazza Armerina","EN"],["Aci Catena","CT"],
  // Toscana
  ["Empoli","FI"],["Scandicci","FI"],["Sesto Fiorentino","FI"],["Campi Bisenzio","FI"],["Bagno a Ripoli","FI"],["Pontedera","PI"],["San Miniato","PI"],["Cascina","PI"],["Viareggio","LU"],["Capannori","LU"],["Camaiore","LU"],["Piombino","LI"],["Rosignano Marittimo","LI"],["Follonica","GR"],["Poggibonsi","SI"],["Montecatini Terme","PT"],["Pescia","PT"],["Carrara","MS"],
  // Trentino-Alto Adige
  ["Rovereto","TN"],["Riva del Garda","TN"],["Pergine Valsugana","TN"],["Merano","BZ"],["Bressanone","BZ"],["Laives","BZ"],
  // Umbria
  ["Foligno","PG"],["Città di Castello","PG"],["Spoleto","PG"],["Orvieto","TR"],
  // Veneto
  ["Mestre","VE"],["Chioggia","VE"],["San Donà di Piave","VE"],["Mira","VE"],["Villafranca di Verona","VR"],["San Bonifacio","VR"],["Legnago","VR"],["Bassano del Grappa","VI"],["Schio","VI"],["Valdagno","VI"],["Arzignano","VI"],["Thiene","VI"],["Castelfranco Veneto","TV"],["Conegliano","TV"],["Montebelluna","TV"],["Vittorio Veneto","TV"],["Paese","TV"],["Cittadella","PD"],["Abano Terme","PD"],["Selvazzano Dentro","PD"],["Vigonza","PD"],["Este","PD"],["Monselice","PD"],["Feltre","BL"],["Adria","RO"],
]

interface PlaceResult {
  displayName?: { text?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  location?: { latitude?: number; longitude?: number }
  id?: string
}

async function searchPlaces(query: string, pageToken?: string): Promise<{ places: PlaceResult[]; nextPageToken?: string }> {
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "it",
    regionCode: "IT",
    maxResultCount: 20,
  }
  if (pageToken) body.pageToken = pageToken

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
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 5000))
      return searchPlaces(query, pageToken)
    }
    return { places: [] }
  }

  return res.json()
}

function extractTownFromAddress(address: string): string {
  const parts = address.split(",").map((p) => p.trim())
  if (parts.length >= 3) {
    const townPart = parts[parts.length - 3] || parts[parts.length - 2]
    return townPart.replace(/^\d{5}\s*/, "").trim()
  }
  return parts[1]?.replace(/^\d{5}\s*/, "").trim() ?? address
}

async function main() {
  console.log("🔴 Import comuni — inserimento attivo")

  // Load existing for dedup
  const existing = await sql`SELECT name, province, town FROM autoscuole`
  const existingKeys = new Set(existing.map((r: any) => `${r.name}|||${r.province}|||${r.town}`))
  console.log(`Autoscuole esistenti: ${existing.length}`)
  console.log(`Comuni da cercare: ${COMUNI.length}`)
  console.log("")

  const seenPlaceIds = new Set<string>()
  let totalNew = 0
  let totalSkipped = 0
  let totalApiCalls = 0
  const totalTasks = COMUNI.length * KEYWORDS.length

  let taskIndex = 0
  for (const [comune, province] of COMUNI) {
    for (const keyword of KEYWORDS) {
      taskIndex++
      const query = `${keyword} ${comune}`
      let pageToken: string | undefined
      let pageCount = 0

      process.stdout.write(`[${taskIndex}/${totalTasks}] "${keyword}" ${comune} (${province})... `)

      let batchNew = 0

      do {
        totalApiCalls++
        const data = await searchPlaces(query, pageToken)
        const places = data.places ?? []
        if (places.length === 0) break

        for (const place of places) {
          const placeId = place.id
          if (!placeId || seenPlaceIds.has(placeId)) { totalSkipped++; continue }
          seenPlaceIds.add(placeId)

          const name = place.displayName?.text ?? "Autoscuola"
          const address = place.formattedAddress ?? ""
          const town = extractTownFromAddress(address)
          const phone = place.nationalPhoneNumber ?? null
          const lat = place.location?.latitude ?? null
          const lng = place.location?.longitude ?? null

          const key = `${name}|||${province}|||${town}`
          if (existingKeys.has(key)) { totalSkipped++; continue }
          existingKeys.add(key)

          const id = `as_${placeId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}_${Date.now()}`

          await sql`INSERT INTO autoscuole (id, name, owner, province, town, phone, email, stage_id, pipeline_value, assigned_to, students, last_contact, lat, lng, address)
            VALUES (${id}, ${name}, ${null}, ${province}, ${town}, ${phone}, ${null}, ${"da_chiamare"}, ${0}, ${null}, ${0}, ${0}, ${lat}, ${lng}, ${address})`

          batchNew++
          totalNew++
        }

        pageToken = data.nextPageToken
        pageCount++
        if (pageToken) await new Promise((r) => setTimeout(r, 1500))
      } while (pageToken && pageCount < 2) // max 2 pages per small town

      console.log(`+${batchNew}`)
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  console.log("")
  console.log("═══════════════════════════════════════")
  console.log(`Nuove autoscuole inserite: ${totalNew}`)
  console.log(`Skippate (doppioni): ${totalSkipped}`)
  console.log(`Chiamate API: ${totalApiCalls}`)
  console.log(`Totale nel DB: ${existing.length + totalNew}`)
  console.log("═══════════════════════════════════════")
}

main().catch((e) => {
  console.error("Errore:", e.message)
  process.exit(1)
})
