import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import bcrypt from "bcryptjs"
import * as schema from "./schema"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// Load .env.local
const envPath = join(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

async function seed() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql, { schema })

  console.log("🧹 Cleaning database...")

  // Clear existing data (order matters for FK constraints)
  await db.delete(schema.commissionLines)
  await db.delete(schema.commissions)
  await db.delete(schema.documents)
  await db.delete(schema.activities)
  await db.delete(schema.autoscuole)
  await db.delete(schema.news)
  await db.delete(schema.resources)
  await db.delete(schema.pipelineStages)
  await db.delete(schema.users)

  console.log("✅ Database cleaned")

  // 1. Pipeline Stages (structural — always needed)
  const stages = [
    { id: "da_chiamare", label: "Da chiamare", color: "#64748B", tone: "slate", order: 0 },
    { id: "non_interessato", label: "Non interessato", color: "#EF4444", tone: "red", order: 1 },
    { id: "follow_up", label: "Follow up", color: "#3B82F6", tone: "blue", order: 2 },
    { id: "email", label: "Email", color: "#8B5CF6", tone: "violet", order: 3 },
    { id: "appuntamento", label: "Appuntamento", color: "#10B981", tone: "green", order: 4 },
    { id: "no_show", label: "No show", color: "#F97316", tone: "orange", order: 5 },
    { id: "cliente", label: "Cliente", color: "#EC4899", tone: "pink", order: 6 },
    { id: "nuove_features", label: "Nuove features", color: "#8B5CF6", tone: "violet", order: 7 },
  ]
  await db.insert(schema.pipelineStages).values(stages)
  console.log("✅ Pipeline stages seeded")

  // 2. Users
  const adminPassword = await bcrypt.hash("Reglo2026!", 10)
  const salesPassword = await bcrypt.hash("reglo2026", 10)
  await db.insert(schema.users).values([
    {
      id: "u_tiziano",
      name: "Tiziano Di Felice",
      email: "Tiziano.difelice@reglo.it",
      password: adminPassword,
      phone: "+39 06 0000 0001",
      role: "admin" as const,
      territory: "Italia",
      color: "#EC4899",
      active: true,
      quota: 0,
    },
    {
      id: "u_gabriele",
      name: "Gabriele Ruzzu",
      email: "gabriele.ruzzu@reglo.it",
      password: salesPassword,
      phone: "+39 06 9876 5432",
      role: "both" as const,
      territory: "Lazio",
      color: "#EC4899",
      active: true,
      quota: 5750,
    },
  ])
  console.log("✅ Users created")

  console.log("\n🎉 Seed complete!")
  console.log("\n📧 Login credentials:")
  console.log("   Email: Tiziano.difelice@reglo.it")
  console.log("   Password: Reglo2026!")
}

seed().catch(console.error)
