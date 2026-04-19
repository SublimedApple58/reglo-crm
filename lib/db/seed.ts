import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import bcrypt from "bcryptjs"
import * as schema from "./schema"

async function seed() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql, { schema })

  console.log("🌱 Seeding database...")

  // Clear existing data
  await db.delete(schema.commissionLines)
  await db.delete(schema.commissions)
  await db.delete(schema.activities)
  await db.delete(schema.autoscuole)
  await db.delete(schema.news)
  await db.delete(schema.resources)
  await db.delete(schema.pipelineStages)
  await db.delete(schema.users)

  // 1. Pipeline Stages
  const stages = [
    { id: "da_chiamare", label: "Da chiamare", color: "#64748B", tone: "slate", order: 0 },
    { id: "non_interessato", label: "Non interessato", color: "#EF4444", tone: "red", order: 1 },
    { id: "follow_up", label: "Follow up", color: "#3B82F6", tone: "blue", order: 2 },
    { id: "email", label: "Email inviata", color: "#8B5CF6", tone: "violet", order: 3 },
    { id: "in_attesa", label: "In attesa", color: "#A855F7", tone: "violet", order: 4 },
    { id: "appuntamento", label: "Appuntamento", color: "#10B981", tone: "green", order: 5 },
    { id: "cliente", label: "Cliente", color: "#F59E0B", tone: "amber", order: 6 },
  ]
  await db.insert(schema.pipelineStages).values(stages)
  console.log("✅ Pipeline stages seeded")

  // 2. Users
  const hashedPassword = await bcrypt.hash("reglo2026", 10)
  const usersData = [
    { id: "u_gabriele", name: "Gabriele Ruzzu", email: "gabriele.ruzzu@reglo.it", password: hashedPassword, phone: "+39 06 9876 5432", role: "both" as const, territory: "Lazio", color: "#EC4899", active: true, quota: 5750 },
    { id: "u_marco", name: "Marco Bianchi", email: "marco.bianchi@reglo.it", password: hashedPassword, phone: "+39 06 1234 5678", role: "sales" as const, territory: "Lazio Nord", color: "#3B82F6", active: true, quota: 5000 },
    { id: "u_sara", name: "Sara Conti", email: "sara.conti@reglo.it", password: hashedPassword, phone: "+39 06 2345 6789", role: "sales" as const, territory: "Roma Sud", color: "#10B981", active: true, quota: 5500 },
    { id: "u_luca", name: "Luca Ferretti", email: "luca.ferretti@reglo.it", password: hashedPassword, phone: "+39 06 3456 7890", role: "sales" as const, territory: "Frosinone", color: "#F59E0B", active: true, quota: 4500 },
    { id: "u_elena", name: "Elena Moretti", email: "elena.moretti@reglo.it", password: hashedPassword, phone: "+39 06 4567 8901", role: "sales" as const, territory: "Latina", color: "#8B5CF6", active: true, quota: 5000 },
    { id: "u_andrea", name: "Andrea Rossi", email: "andrea.rossi@reglo.it", password: hashedPassword, phone: "+39 06 5678 9012", role: "sales" as const, territory: "Roma Nord", color: "#EF4444", active: true, quota: 6000 },
    { id: "u_chiara", name: "Chiara Galli", email: "chiara.galli@reglo.it", password: hashedPassword, phone: "+39 06 6789 0123", role: "sales" as const, territory: "Viterbo", color: "#06B6D4", active: false, quota: 4000 },
    { id: "u_davide", name: "Davide Ricci", email: "davide.ricci@reglo.it", password: hashedPassword, phone: "+39 06 7890 1234", role: "sales" as const, territory: "Rieti", color: "#F97316", active: true, quota: 4000 },
    { id: "u_admin", name: "Admin Reglo", email: "admin@reglo.it", password: hashedPassword, phone: "+39 06 0000 0000", role: "admin" as const, territory: "Italia", color: "#0F172A", active: true, quota: 0 },
  ]
  await db.insert(schema.users).values(usersData)
  console.log("✅ Users seeded")

  // 3. Autoscuole
  const autoscuoleNames = [
    "Autoscuola Agenzia Pratiche Auto", "Autoscuola Roma Driving", "Autoscuola Casilina",
    "Autoscuola Appia", "Autoscuola Tiburtina", "Autoscuola Flaminia", "Autoscuola Nomentana",
    "Autoscuola Prenestina", "Autoscuola Tuscolana", "Autoscuola EUR", "Autoscuola Ostia",
    "Autoscuola Trastevere", "Autoscuola Testaccio", "Autoscuola Prati", "Autoscuola Monteverde",
    "Autoscuola Latina Centro", "Autoscuola Pontina", "Autoscuola Formia",
    "Autoscuola Frosinone Centro", "Autoscuola Cassino", "Autoscuola Fiuggi",
    "Autoscuola Viterbo Centro", "Autoscuola Civita Castellana", "Autoscuola Montefiascone",
    "Autoscuola Rieti Centro", "Autoscuola Poggio Mirteto",
    "Autoscuola Salaria", "Autoscuola Colosseo", "Autoscuola San Giovanni",
    "Autoscuola Cinecittà",
  ]

  const provinces = [
    { code: "RM", towns: ["Roma", "Fiumicino", "Guidonia", "Tivoli", "Ciampino", "Pomezia", "Ardea", "Velletri", "Frascati", "Anzio"], lat: 41.9028, lng: 12.4964 },
    { code: "LT", towns: ["Latina", "Formia", "Terracina", "Aprilia", "Fondi"], lat: 41.4676, lng: 12.9037 },
    { code: "FR", towns: ["Frosinone", "Cassino", "Fiuggi", "Alatri", "Sora"], lat: 41.6399, lng: 13.3499 },
    { code: "VT", towns: ["Viterbo", "Civita Castellana", "Montefiascone", "Tarquinia"], lat: 42.4201, lng: 12.1076 },
    { code: "RI", towns: ["Rieti", "Poggio Mirteto", "Fara in Sabina", "Cittaducale"], lat: 42.4025, lng: 12.8579 },
  ]

  const salesIds = ["u_gabriele", "u_marco", "u_sara", "u_luca", "u_elena", "u_andrea", "u_davide"]
  const stageIds = stages.map((s) => s.id)

  const autoscuoleData = autoscuoleNames.map((name, i) => {
    const provIdx = i < 15 ? 0 : i < 18 ? 1 : i < 21 ? 2 : i < 24 ? 3 : i < 26 ? 4 : i % 5
    const prov = provinces[provIdx]
    const town = prov.towns[i % prov.towns.length]
    const stageId = stageIds[i % stageIds.length]
    const assignedTo = i < 28 ? salesIds[i % salesIds.length] : null
    return {
      id: `as_${1000 + i}`,
      name,
      owner: name.replace("Autoscuola ", "").split(" ")[0],
      province: prov.code,
      town,
      phone: `+39 0${Math.floor(Math.random() * 9) + 1} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      email: `info@${name.toLowerCase().replace(/\s+/g, "").replace(/autoscuola/g, "").slice(0, 12)}scuola.it`,
      stageId,
      pipelineValue: Math.floor(800 + Math.random() * 4200),
      assignedTo,
      students: Math.floor(20 + Math.random() * 180),
      lastContact: Math.floor(Math.random() * 30),
      lat: prov.lat + (Math.random() - 0.5) * 0.3,
      lng: prov.lng + (Math.random() - 0.5) * 0.3,
      address: `Via ${["Roma", "Garibaldi", "Cavour", "Mazzini", "Verdi", "Dante"][i % 6]} ${Math.floor(1 + Math.random() * 120)}, ${town}`,
    }
  })
  await db.insert(schema.autoscuole).values(autoscuoleData)
  console.log("✅ Autoscuole seeded")

  // 4. Activities
  const activityTypes = ["call", "email", "meeting", "note", "stage_change"] as const
  const activityData = []
  for (let i = 0; i < 40; i++) {
    const as = autoscuoleData[i % autoscuoleData.length]
    const type = activityTypes[i % activityTypes.length]
    activityData.push({
      autoscuolaId: as.id,
      userId: salesIds[i % salesIds.length],
      type,
      title: type === "call" ? `Chiamata con ${as.owner}` :
             type === "email" ? `Email inviata a ${as.name}` :
             type === "meeting" ? `Meeting presso ${as.name}` :
             type === "note" ? `Nota su ${as.name}` :
             `Stage cambiato per ${as.name}`,
      body: type === "call" ? "Discusso piano formativo e pricing. Interessati al pacchetto Premium." :
            type === "email" ? "Inviata presentazione commerciale con listino aggiornato Q2 2026." :
            type === "meeting" ? "Incontro presso la sede. Visionato struttura e flotta veicoli." :
            type === "note" ? "Titolare molto interessato, richiamato feedback positivo da collega." :
            "Avanzamento nella pipeline dopo follow-up positivo.",
      createdAt: new Date(Date.now() - i * 3600000 * 6),
    })
  }
  await db.insert(schema.activities).values(activityData)
  console.log("✅ Activities seeded")

  // 5. News
  const newsData = [
    { category: "COMMISSIONI", title: "Nuove soglie commissioni Q2 2026", excerpt: "Le soglie commissioni sono state aggiornate per il secondo trimestre. Bonus acceleratore confermato al 5%.", body: "<h2>Aggiornamento Commissioni Q2</h2><p>A partire da aprile 2026, le soglie commissioni sono state riviste per premiare maggiormente i top performer.</p><p><strong>Novità principali:</strong></p><ul><li>Il tier Premium ora parte da 6 contratti (era 8)</li><li>Il bonus acceleratore rimane al 5% oltre i 10 contratti</li><li>Nuovo bonus trimestrale per chi supera la quota per 3 mesi consecutivi</li></ul><p>Contattate il vostro responsabile per maggiori dettagli.</p>", pinned: true, authorId: "u_admin" },
    { category: "PRODOTTO", title: "Integrazione Grain AI disponibile", excerpt: "Ora potete registrare e analizzare le vostre chiamate commerciali con Grain AI direttamente dal CRM.", body: "<h2>Grain AI Integration</h2><p>Siamo felici di annunciare l'integrazione con Grain AI per la registrazione e analisi automatica delle chiamate commerciali.</p><p><strong>Come funziona:</strong></p><ol><li>Collega il tuo account Grain dalle Impostazioni</li><li>Avvia la registrazione prima di ogni chiamata</li><li>Grain trascrive e analizza automaticamente il contenuto</li></ol>", pinned: true, authorId: "u_admin" },
    { category: "MOBILE", title: "App mobile: aggiornamento v2.1", excerpt: "Nuova versione dell'app con notifiche push e accesso rapido alla pipeline.", body: "<h2>Reglo Mobile v2.1</h2><p>La nuova versione dell'app mobile è ora disponibile su App Store e Play Store.</p><p><strong>Novità:</strong></p><ul><li>Notifiche push per nuovi lead assegnati</li><li>Widget pipeline nella home screen</li><li>Scansione biglietti da visita con OCR</li></ul>", pinned: false, authorId: "u_admin" },
    { category: "COMMISSIONI", title: "Report mensile marzo 2026", excerpt: "Il team ha raggiunto il 112% della quota complessiva. Complimenti a tutti!", body: "<h2>Report Marzo 2026</h2><p>Risultati eccellenti per il team commerciale nel mese di marzo.</p><p><strong>Highlights:</strong></p><ul><li>Quota raggiunta: 112%</li><li>Nuovi contratti: 34</li><li>Valore totale: €48.200</li><li>Top performer: Sara Conti (145% quota)</li></ul>", pinned: false, authorId: "u_admin" },
    { category: "PRODOTTO", title: "Nuova funzione: Mappa territorio", excerpt: "Visualizza le tue autoscuole su una mappa interattiva con filtri per provincia e stage.", body: "<h2>Mappa Territorio</h2><p>La nuova vista mappa vi permette di visualizzare geograficamente tutte le autoscuole assegnate.</p>", pinned: false, authorId: "u_admin" },
  ]
  await db.insert(schema.news).values(newsData)
  console.log("✅ News seeded")

  // 6. Commissions
  const months = [
    { month: 11, year: 2025, gross: 3100, contracts: 4 },
    { month: 12, year: 2025, gross: 3800, contracts: 5 },
    { month: 1, year: 2026, gross: 2900, contracts: 4 },
    { month: 2, year: 2026, gross: 4100, contracts: 6 },
    { month: 3, year: 2026, gross: 3650, contracts: 5 },
    { month: 4, year: 2026, gross: 4280, contracts: 6 },
  ]
  for (const m of months) {
    const [comm] = await db.insert(schema.commissions).values({
      userId: "u_gabriele",
      month: m.month,
      year: m.year,
      gross: m.gross,
      contracts: m.contracts,
    }).returning()

    // Add commission lines for current month
    if (m.month === 4 && m.year === 2026) {
      const lines = [
        { commissionId: comm.id, autoscuolaId: "as_1000", contractValue: 2400, commissionRate: 0.15, commissionAmount: 360, date: new Date("2026-04-03") },
        { commissionId: comm.id, autoscuolaId: "as_1005", contractValue: 3200, commissionRate: 0.15, commissionAmount: 480, date: new Date("2026-04-07") },
        { commissionId: comm.id, autoscuolaId: "as_1009", contractValue: 1800, commissionRate: 0.25, commissionAmount: 450, date: new Date("2026-04-10") },
        { commissionId: comm.id, autoscuolaId: "as_1012", contractValue: 4100, commissionRate: 0.25, commissionAmount: 1025, date: new Date("2026-04-12") },
        { commissionId: comm.id, autoscuolaId: "as_1015", contractValue: 2800, commissionRate: 0.25, commissionAmount: 700, date: new Date("2026-04-15") },
        { commissionId: comm.id, autoscuolaId: "as_1018", contractValue: 5100, commissionRate: 0.25, commissionAmount: 1275, date: new Date("2026-04-17") },
      ]
      await db.insert(schema.commissionLines).values(lines)
    }
  }
  console.log("✅ Commissions seeded")

  // 7. Resources
  const resourcesData = [
    { category: "Script chiamate", title: "Script primo contatto a freddo", excerpt: "Modello di script per la prima chiamata a freddo verso un'autoscuola non ancora contattata.", html: "<h2>Script Primo Contatto</h2><p><strong>Apertura:</strong></p><p>\"Buongiorno, sono [Nome] di Reglo. Sto contattando le migliori autoscuole di [Provincia] per presentare una soluzione che sta aiutando molte scuole guida a digitalizzare la gestione degli allievi.\"</p><p><strong>Qualificazione:</strong></p><p>\"Quanti allievi gestite attualmente? Utilizzate già un software gestionale?\"</p><p><strong>Value proposition:</strong></p><p>\"Reglo permette di gestire iscrizioni, prenotazioni guide, esami e pagamenti in un'unica piattaforma. Le autoscuole che lo usano risparmiano in media 15 ore settimanali.\"</p><p><strong>Chiusura:</strong></p><p>\"Mi piacerebbe mostrarle una demo di 15 minuti. Ha disponibilità questa settimana o la prossima?\"</p>", pinned: true, tags: ["cold", "primo contatto", "5 min"], icon: "phone", color: "#EC4899", authorId: "u_admin" },
    { category: "Script chiamate", title: "Script follow-up dopo demo", excerpt: "Modello per il follow-up dopo una demo o meeting con il titolare.", html: "<h2>Script Follow-up Post-Demo</h2><p>\"Buongiorno [Nome], sono [Sales] di Reglo. La chiamo per un follow-up sulla demo che abbiamo fatto [data]. Come procede la valutazione?\"</p>", pinned: false, tags: ["follow-up", "post-demo"], icon: "phone", color: "#EC4899", authorId: "u_admin" },
    { category: "Template email", title: "Email presentazione commerciale", excerpt: "Template email per inviare la presentazione commerciale dopo il primo contatto.", html: "<h2>Template Presentazione</h2><p>Oggetto: Reglo – La piattaforma digitale per autoscuole</p><p>Gentile [Nome],</p><p>come concordato telefonicamente, le invio la nostra presentazione commerciale...</p>", pinned: true, tags: ["email", "presentazione", "primo invio"], icon: "mail", color: "#3B82F6", authorId: "u_admin" },
    { category: "Gestione obiezioni", title: "Obiezione: troppo costoso", excerpt: "Come gestire l'obiezione sul prezzo e riportare la conversazione sul valore.", html: "<h2>\"È troppo costoso\"</h2><p><strong>Non dire mai:</strong> \"Posso fare uno sconto\"</p><p><strong>Risposta consigliata:</strong></p><p>\"Capisco la sua preoccupazione sul prezzo. Molti titolari inizialmente la pensavano come lei. Dopo aver provato Reglo, hanno scoperto che il risparmio di tempo equivale a [X ore/settimana], che tradotto in costi del personale vale molto di più dell'investimento.\"</p>", pinned: true, tags: ["prezzo", "obiezione comune"], icon: "shield", color: "#F97316", authorId: "u_admin" },
    { category: "Listino", title: "Listino prezzi Q2 2026", excerpt: "Listino aggiornato con tutti i pacchetti, opzioni e scontistiche volume.", html: "<h2>Listino Prezzi Q2 2026</h2><table><tr><th>Pacchetto</th><th>Prezzo mensile</th><th>Allievi max</th></tr><tr><td>Starter</td><td>€89/mese</td><td>50</td></tr><tr><td>Professional</td><td>€149/mese</td><td>150</td></tr><tr><td>Enterprise</td><td>€249/mese</td><td>Illimitati</td></tr></table>", pinned: true, tags: ["prezzi", "Q2 2026"], icon: "file-text", color: "#10B981", authorId: "u_admin" },
    { category: "Playbook", title: "Playbook vendita consultiva", excerpt: "Guida completa alla vendita consultiva per autoscuole: dalla qualificazione alla chiusura.", html: "<h2>Playbook Vendita Consultiva</h2><p>La vendita consultiva si basa sull'ascolto attivo e sulla comprensione profonda dei bisogni del cliente.</p><h3>Fase 1: Discovery</h3><p>Obiettivo: comprendere la situazione attuale dell'autoscuola...</p><h3>Fase 2: Presentazione soluzione</h3><p>Obiettivo: mostrare come Reglo risolve i problemi specifici emersi...</p>", pinned: false, tags: ["vendita consultiva", "processo"], icon: "book-open", color: "#8B5CF6", authorId: "u_admin" },
  ]
  await db.insert(schema.resources).values(resourcesData)
  console.log("✅ Resources seeded")

  console.log("\n🎉 Seed complete!")
  console.log("\n📧 Login credentials:")
  console.log("   Email: gabriele.ruzzu@reglo.it (sales+admin)")
  console.log("   Email: admin@reglo.it (admin only)")
  console.log("   Password: reglo2026")
}

seed().catch(console.error)
