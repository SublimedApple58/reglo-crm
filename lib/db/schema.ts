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
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  autoscuolaId: text("autoscuola_id").notNull().references(() => autoscuole.id),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["call", "email", "meeting", "note", "stage_change"] }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  body: text("body"),
  pinned: boolean("pinned").default(false),
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
