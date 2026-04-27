import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  real,
  serial,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  phone: text("phone"),
  role: text("role", { enum: ["sales", "admin", "both"] }).notNull().default("sales"),
  territory: text("territory"),
  color: text("color").notNull().default("#EC4899"),
  avatar: text("avatar"),
  active: boolean("active").notNull().default(true),
  quota: real("quota").default(5750),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const pipelineStages = pgTable("pipeline_stages", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  color: text("color").notNull(),
  tone: text("tone").notNull(),
  order: integer("order").notNull(),
})

export const autoscuole = pgTable("autoscuole", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  owner: text("owner"),
  province: varchar("province", { length: 2 }).notNull(),
  town: text("town").notNull(),
  phone: text("phone"),
  email: text("email"),
  stageId: text("stage_id").notNull().references(() => pipelineStages.id),
  pipelineValue: real("pipeline_value").default(0),
  assignedTo: text("assigned_to").references(() => users.id),
  students: integer("students").default(0),
  lastContact: integer("last_contact").default(0), // days ago
  notes: text("notes"),
  lat: real("lat"),
  lng: real("lng"),
  address: text("address"),
  package: text("package"), // e.g. "Starter", "Professional", "Enterprise"
  closeProbability: real("close_probability"), // 0-100
  commissionRate: real("commission_rate"), // 0-1
  expectedCloseDate: timestamp("expected_close_date"),
  info: jsonb("info").$type<Record<string, string>>(),
  followUpAt: timestamp("follow_up_at"),
  interesseQuiz: boolean("interesse_quiz"),
  interesseRinnovo: boolean("interesse_rinnovo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  autoscuolaId: text("autoscuola_id").notNull().references(() => autoscuole.id),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["call", "email", "meeting", "note", "stage_change"] }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  meetLink: text("meet_link"),
  calendarEventId: text("calendar_event_id"),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  body: text("body"),
  pinned: boolean("pinned").default(false),
  icon: text("icon"),
  authorId: text("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  gross: real("gross").default(0),
  contracts: integer("contracts").default(0),
})

export const commissionLines = pgTable("commission_lines", {
  id: serial("id").primaryKey(),
  commissionId: integer("commission_id").notNull().references(() => commissions.id),
  autoscuolaId: text("autoscuola_id").references(() => autoscuole.id),
  contractValue: real("contract_value").notNull(),
  commissionRate: real("commission_rate").notNull(),
  commissionAmount: real("commission_amount").notNull(),
  date: timestamp("date").notNull(),
})

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  autoscuolaId: text("autoscuola_id").notNull().references(() => autoscuole.id),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  key: text("key").notNull(), // R2 object key
  size: integer("size").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  html: text("html"),
  authorId: text("author_id").references(() => users.id),
  tags: text("tags").array(),
  pinned: boolean("pinned").default(false),
  icon: text("icon"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Sales territory assignments (region → sales)
export const salesTerritories = pgTable("sales_territories", {
  userId: text("user_id").notNull().references(() => users.id),
  region: text("region").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.region] })])

// Blocked provinces for territory management
export const blockedProvinces = pgTable("blocked_provinces", {
  province: varchar("province", { length: 2 }).primaryKey(),
})

// News categories (dynamic CRUD)
export const newsCategories = pgTable("news_categories", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  color: text("color"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// News read tracking
export const newsReads = pgTable("news_reads", {
  userId: text("user_id").notNull().references(() => users.id),
  newsId: integer("news_id").notNull().references(() => news.id),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.newsId] })])

// Comments on news and resources
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  targetType: text("target_type", { enum: ["news", "resource"] }).notNull(),
  targetId: integer("target_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Home cards (dynamic CRUD)
export const homeCards = pgTable("home_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  link: text("link"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// OAuth tokens for Google Calendar etc.
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Contract requests (Sales → Admin)
export const contractRequests = pgTable("contract_requests", {
  id: serial("id").primaryKey(),
  autoscuolaId: text("autoscuola_id").notNull().references(() => autoscuole.id),
  requestedBy: text("requested_by").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "in_progress", "done", "rejected"] }).notNull().default("pending"),
  importoPreventivo: real("importo_preventivo"),
  descrizioneServizio: text("descrizione_servizio"),
  rejectionReason: text("rejection_reason"),
  contractPdfKey: text("contract_pdf_key"),
  contractPdfName: text("contract_pdf_name"),
  invoicePdfKey: text("invoice_pdf_key"),
  invoicePdfName: text("invoice_pdf_name"),
  ragioneSociale: text("ragione_sociale"),
  partitaIva: text("partita_iva"),
  codiceFiscale: text("codice_fiscale"),
  pecEmail: text("pec_email"),
  codiceSDI: text("codice_sdi"),
  indirizzoFatturazione: text("indirizzo_fatturazione"),
  capFatturazione: text("cap_fatturazione"),
  cittaFatturazione: text("citta_fatturazione"),
  provinciaFatturazione: text("provincia_fatturazione"),
  nomeLegale: text("nome_legale"),
  cognomeLegale: text("cognome_legale"),
  telefonoLegale: text("telefono_legale"),
  emailLegale: text("email_legale"),
  iban: text("iban"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Type exports
export type User = typeof users.$inferSelect
export type Autoscuola = typeof autoscuole.$inferSelect
export type PipelineStage = typeof pipelineStages.$inferSelect
export type Activity = typeof activities.$inferSelect
export type News = typeof news.$inferSelect
export type Commission = typeof commissions.$inferSelect
export type CommissionLine = typeof commissionLines.$inferSelect
export type Resource = typeof resources.$inferSelect
export type Document = typeof documents.$inferSelect
export type BlockedProvince = typeof blockedProvinces.$inferSelect
export type NewsCategory = typeof newsCategories.$inferSelect
export type NewsRead = typeof newsReads.$inferSelect
export type Comment = typeof comments.$inferSelect
export type HomeCard = typeof homeCards.$inferSelect
export type OAuthToken = typeof oauthTokens.$inferSelect
export type SalesTerritory = typeof salesTerritories.$inferSelect
export type ContractRequest = typeof contractRequests.$inferSelect
