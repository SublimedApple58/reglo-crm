export const STAGES = [
  { id: "da_chiamare", label: "Da chiamare", color: "#64748B", tone: "slate", order: 0 },
  { id: "non_interessato", label: "Non interessato", color: "#EF4444", tone: "red", order: 1 },
  { id: "follow_up", label: "Follow up", color: "#3B82F6", tone: "blue", order: 2 },
  { id: "email", label: "Email inviata", color: "#8B5CF6", tone: "violet", order: 3 },
  { id: "in_attesa", label: "In attesa", color: "#A855F7", tone: "violet", order: 4 },
  { id: "appuntamento", label: "Appuntamento", color: "#10B981", tone: "green", order: 5 },
  { id: "cliente", label: "Cliente", color: "#F59E0B", tone: "amber", order: 6 },
] as const

export type StageId = (typeof STAGES)[number]["id"]

export const ROLES = ["sales", "admin", "both"] as const
export type Role = (typeof ROLES)[number]

export const PROVINCES_LAZIO = [
  { code: "RM", name: "Roma", lat: 41.9028, lng: 12.4964 },
  { code: "LT", name: "Latina", lat: 41.4676, lng: 12.9037 },
  { code: "FR", name: "Frosinone", lat: 41.6399, lng: 13.3499 },
  { code: "VT", name: "Viterbo", lat: 42.4201, lng: 12.1076 },
  { code: "RI", name: "Rieti", lat: 42.4025, lng: 12.8579 },
] as const

export const RESOURCE_CATEGORIES = [
  { id: "script", label: "Script chiamate", icon: "phone", color: "#EC4899" },
  { id: "template", label: "Template email", icon: "mail", color: "#3B82F6" },
  { id: "obiezioni", label: "Gestione obiezioni", icon: "shield", color: "#F97316" },
  { id: "listino", label: "Listino", icon: "file-text", color: "#10B981" },
  { id: "playbook", label: "Playbook", icon: "book-open", color: "#8B5CF6" },
] as const

export const NEWS_CATEGORIES = [
  { id: "COMMISSIONI", color: "#EC4899" },
  { id: "PRODOTTO", color: "#3B82F6" },
  { id: "MOBILE", color: "#10B981" },
] as const

export const COMMISSION_TIERS = [
  { tier: "Base", rate: 0.15, desc: "Fino a 5 contratti/mese – commissione standard del 15% sul valore contratto" },
  { tier: "Premium", rate: 0.25, desc: "Da 6 a 10 contratti/mese – commissione maggiorata al 25%", highlight: true },
  { tier: "Bonus acceleratore", rate: 0.05, desc: "Oltre 10 contratti/mese – bonus aggiuntivo del 5% su tutti i contratti del mese" },
] as const

export const SALES_COLORS = [
  "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EF4444", "#06B6D4", "#F97316", "#14B8A6",
] as const
