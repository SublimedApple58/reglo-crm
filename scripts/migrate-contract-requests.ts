import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log("Running contract_requests migration...")

  await sql`
    CREATE TABLE IF NOT EXISTS "contract_requests" (
      "id" serial PRIMARY KEY,
      "autoscuola_id" text NOT NULL REFERENCES "autoscuole"("id"),
      "requested_by" text NOT NULL REFERENCES "users"("id"),
      "status" text NOT NULL DEFAULT 'pending',
      "ragione_sociale" text,
      "partita_iva" text,
      "codice_fiscale" text,
      "pec_email" text,
      "codice_sdi" text,
      "indirizzo_fatturazione" text,
      "cap_fatturazione" text,
      "citta_fatturazione" text,
      "provincia_fatturazione" text,
      "nome_legale" text,
      "cognome_legale" text,
      "telefono_legale" text,
      "email_legale" text,
      "iban" text,
      "notes" text,
      "admin_notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `

  console.log("Done! contract_requests table created.")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
